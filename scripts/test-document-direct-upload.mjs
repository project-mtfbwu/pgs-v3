import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.PGS_TEST_BASE_URL ?? "http://127.0.0.1:3001";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !publishableKey || !serviceKey) {
  throw new Error("Supabase URL, publishable key, and service-role key are required.");
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const directStorage = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const email = `phase4d-${randomUUID()}@example.test`;
const password = `P4d!${randomUUID()}aA`;
const requirementId = randomUUID();
let userId;
let objectPath;

function responseCookies(response) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => value.split(";", 1)[0]).join("; ");
}

async function api(path, body, cookie) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {})
    },
    body: JSON.stringify(body)
  });
  return { response, body: await response.json() };
}

try {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (createError || !created.user) throw createError ?? new Error("Fixture user missing.");
  userId = created.user.id;

  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setUTCFullYear(endsAt.getUTCFullYear() + 1);
  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    full_name: "Phase 4D direct-upload proof"
  });
  if (profileError) throw profileError;
  const { error: entitlementError } = await admin.from("premium_entitlements").insert({
    student_id: userId,
    status: "active",
    source: "admin_grant",
    plan_code: "12_month",
    duration_months: 12,
    approved_at: now.toISOString(),
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString()
  });
  if (entitlementError) throw entitlementError;
  const { error: requirementError } = await admin.from("student_document_requirements").insert({
    id: requirementId,
    student_id: userId,
    document_type: "Phase 4D near-50 MB proof",
    requirement_kind: "required"
  });
  if (requirementError) throw requirementError;

  const login = await api("/api/auth/login", { email, password, redirect: "/upload_your_doc" });
  if (!login.response.ok) throw new Error(`Login failed: ${JSON.stringify(login.body)}`);
  const cookie = responseCookies(login.response);
  if (!cookie) throw new Error("Login did not return an SSR session cookie.");

  const oversized = await api("/api/premium/documents/upload-session", {
    requirement_id: requirementId,
    filename: "oversized.pdf",
    mime_type: "application/pdf",
    byte_size: 52_428_801
  }, cookie);
  if (oversized.response.status !== 400) {
    throw new Error(`Expected >50 MB authorization rejection, got ${oversized.response.status}.`);
  }

  const byteLength = Number(process.env.PGS_TEST_UPLOAD_BYTES ?? 49 * 1024 * 1024);
  if (!Number.isSafeInteger(byteLength) || byteLength < 9 || byteLength > 50 * 1024 * 1024) {
    throw new Error("PGS_TEST_UPLOAD_BYTES must be between 9 bytes and 50 MB.");
  }
  const bytes = new Uint8Array(byteLength);
  bytes.set(new TextEncoder().encode("%PDF-1.4\n"));
  const hash = createHash("sha256").update(bytes).digest("hex");

  const authorization = await api("/api/premium/documents/upload-session", {
    requirement_id: requirementId,
    filename: "near-50mb-proof.pdf",
    mime_type: "application/pdf",
    byte_size: byteLength
  }, cookie);
  if (!authorization.response.ok) {
    throw new Error(`Authorization failed: ${JSON.stringify(authorization.body)}`);
  }
  objectPath = authorization.body.path;
  const canonicalPrefix = `${userId}/${requirementId}/`;
  if (
    typeof objectPath !== "string"
    || !objectPath.startsWith(canonicalPrefix)
    || authorization.body.upsert !== false
  ) {
    throw new Error("Server did not issue the expected canonical no-overwrite path.");
  }

  const file = new Blob([bytes], { type: "application/pdf" });
  const { error: uploadError } = await directStorage.storage
    .from("student-documents")
    .uploadToSignedUrl(objectPath, authorization.body.token, file, {
      contentType: "application/pdf",
      upsert: false
    });
  if (uploadError) throw uploadError;

  const finalize = await api("/api/premium/documents/finalize", {
    session_id: authorization.body.session_id,
    sha256: hash
  }, cookie);
  if (!finalize.response.ok) {
    throw new Error(`Finalize failed: ${JSON.stringify(finalize.body)}`);
  }

  const { data: document, error: documentError } = await admin
    .from("student_documents")
    .select("id,student_id,requirement_id,storage_path,byte_size,scan_status,qc_status,superseded_at,archived_at")
    .eq("id", finalize.body.id)
    .single();
  if (documentError) throw documentError;
  if (
    document.student_id !== userId
    || document.requirement_id !== requirementId
    || document.storage_path !== objectPath
    || document.byte_size !== byteLength
    || document.scan_status !== "pending"
    || document.qc_status !== "pending"
    || document.superseded_at
    || document.archived_at
  ) {
    throw new Error(`Unexpected finalized lifecycle row: ${JSON.stringify(document)}`);
  }

  const delivery = await fetch(`${baseUrl}/api/premium/documents/${document.id}`, {
    headers: { cookie }
  });
  if (delivery.status !== 404) {
    throw new Error(`Pending document was deliverable (status ${delivery.status}).`);
  }

  console.log(JSON.stringify({
    ok: true,
    bytes_uploaded_directly: byteLength,
    canonical_path: true,
    finalized_pending: true,
    pending_delivery_denied: true,
    oversized_authorization_denied: true
  }));
} finally {
  if (objectPath) {
    await admin.storage.from("student-documents").remove([objectPath]);
  }
  if (userId) {
    await admin.from("student_documents").delete().eq("student_id", userId);
    await admin.from("document_upload_sessions").delete().eq("student_id", userId);
    await admin.from("student_document_requirements").delete().eq("student_id", userId);
    await admin.from("premium_entitlements").delete().eq("student_id", userId);
    await admin.from("profiles").delete().eq("id", userId);
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserError) throw deleteUserError;
  }
}
