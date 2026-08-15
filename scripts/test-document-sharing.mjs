import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.PGS_TEST_BASE_URL ?? "http://127.0.0.1:3001";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const password = process.env.PGS_PREVIEW_FIXTURE_PASSWORD;
if (!url || !serviceKey || !publicKey || !password) {
  throw new Error("Preview Supabase configuration and fixture password are required.");
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listed.error) throw listed.error;
const users = new Map(listed.data.users.map((user) => [user.email, user]));
const fixture = (name) => {
  const user = users.get(`pgs-v3-fixture+${name}@example.test`);
  if (!user) throw new Error(`Missing Preview fixture ${name}.`);
  return user;
};

async function authenticated(name) {
  const cookies = new Map();
  const supabase = createServerClient(url, publicKey, {
    auth: { flowType: "pkce" },
    cookies: {
      getAll: () => [...cookies.values()],
      setAll: (values) => {
        for (const value of values) cookies.set(value.name, value);
      }
    }
  });
  const login = await supabase.auth.signInWithPassword({
    email: `pgs-v3-fixture+${name}@example.test`,
    password
  });
  if (login.error) throw login.error;
  return {
    supabase,
    cookie: [...cookies.values()].map(({ name: key, value }) => `${key}=${value}`).join("; ")
  };
}

const checks = [];
function check(condition, message) {
  if (!condition) throw new Error(message);
  checks.push(message);
}
async function api(path, cookie, init = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Cookie: cookie,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers
    }
  });
}

const premiumStudent = fixture("student-a");
const recipient = fixture("viewer");
const requirementId = randomUUID();
const documentId = randomUUID();
const siblingId = randomUUID();
const path = `${premiumStudent.id}/${requirementId}/${documentId}.pdf`;
const siblingPath = `${premiumStudent.id}/${requirementId}/${siblingId}.pdf`;
let shareId;
let issuedUrl;

try {
  const requirement = await admin.from("student_document_requirements").insert({
    id: requirementId,
    student_id: premiumStudent.id,
    document_type: `Phase 4E Preview ${requirementId}`
  });
  if (requirement.error) throw requirement.error;
  const documents = await admin.from("student_documents").insert([
    {
      id: documentId,
      student_id: premiumStudent.id,
      requirement_id: requirementId,
      storage_path: path,
      original_filename: "phase4e.pdf",
      mime_type: "application/pdf",
      byte_size: 9,
      sha256: "a".repeat(64),
      version: 1,
      scan_status: "clean",
      qc_status: "pending",
      uploaded_by: premiumStudent.id
    },
    {
      id: siblingId,
      student_id: premiumStudent.id,
      requirement_id: requirementId,
      storage_path: siblingPath,
      original_filename: "phase4e-sibling.pdf",
      mime_type: "application/pdf",
      byte_size: 9,
      sha256: "b".repeat(64),
      version: 2,
      scan_status: "clean",
      qc_status: "pending",
      uploaded_by: premiumStudent.id
    }
  ]);
  if (documents.error) throw documents.error;
  const uploaded = await admin.storage.from("student-documents").upload(
    path,
    new TextEncoder().encode("%PDF-1.4"),
    { contentType: "application/pdf", upsert: false }
  );
  if (uploaded.error) throw uploaded.error;

  const [adminActor, recipientActor, mentorActor, studentActor] = await Promise.all([
    authenticated("admin"),
    authenticated("viewer"),
    authenticated("mentor-a"),
    authenticated("student-b")
  ]);

  const created = await api(`/api/premium/documents/${documentId}/shares`, adminActor.cookie, {
    method: "POST",
    body: JSON.stringify({ recipient_user_id: recipient.id })
  });
  check(created.status === 200, "Admin creates exact-version share");
  const createdBody = await created.json();
  shareId = createdBody.share_id;
  check(typeof shareId === "string" && createdBody.regranted === false, "Share returns one canonical authorization");

  const mentorDenied = await api(`/api/premium/documents/${documentId}/shares`, mentorActor.cookie, {
    method: "POST",
    body: JSON.stringify({ recipient_user_id: recipient.id })
  });
  check(mentorDenied.status === 403, "Mentor cannot create shares");
  const recipientDenied = await api(`/api/premium/documents/${documentId}/shares`, recipientActor.cookie, {
    method: "POST",
    body: JSON.stringify({ recipient_user_id: recipient.id })
  });
  check(recipientDenied.status === 403, "Read-only staff cannot create shares");

  const allowed = await api(`/api/premium/documents/${documentId}`, recipientActor.cookie);
  check(allowed.status === 200, "Explicit recipient receives shared clean document");
  issuedUrl = (await allowed.json()).url;
  check((await fetch(issuedUrl)).status === 200, "Issued signed URL downloads exact bytes");

  const siblingDenied = await api(`/api/premium/documents/${siblingId}`, recipientActor.cookie);
  check(siblingDenied.status === 404, "Share does not expose sibling document");
  const studentDenied = await api(`/api/premium/documents/${documentId}`, studentActor.cookie);
  check(studentDenied.status === 404, "Unrelated student receives no shared access");
  const directStorage = await recipientActor.supabase.storage.from("student-documents").download(path);
  check(Boolean(directStorage.error), "Share grants no direct Storage read");

  const revoked = await api(
    `/api/premium/documents/${documentId}/shares/${shareId}`,
    adminActor.cookie,
    { method: "DELETE" }
  );
  check(revoked.status === 200, "Admin revokes exact share");
  const afterRevoke = await api(`/api/premium/documents/${documentId}`, recipientActor.cookie);
  check(afterRevoke.status === 403, "Revocation blocks every new signed URL");
  check((await fetch(issuedUrl)).status === 200, "Previously issued URL remains valid within its short TTL");

  const expiresAt = new Date(Date.now() + 10_000).toISOString();
  const regranted = await api(`/api/premium/documents/${documentId}/shares`, adminActor.cookie, {
    method: "POST",
    body: JSON.stringify({ recipient_user_id: recipient.id, expires_at: expiresAt })
  });
  check(regranted.status === 200 && (await regranted.json()).regranted === true, "Regrant reuses authorization row");
  await new Promise((resolve) => setTimeout(resolve, 10_200));
  const expired = await api(`/api/premium/documents/${documentId}`, recipientActor.cookie);
  check(expired.status === 403, "Expiry denies without worker dependency");

  const activeAgain = await api(`/api/premium/documents/${documentId}/shares`, adminActor.cookie, {
    method: "POST",
    body: JSON.stringify({ recipient_user_id: recipient.id })
  });
  check(activeAgain.status === 200, "Admin can regrant after expiry");
  const superseded = await admin.from("student_documents").update({ superseded_at: new Date().toISOString() }).eq("id", documentId);
  if (superseded.error) throw superseded.error;
  const supersededDenied = await api(`/api/premium/documents/${documentId}`, recipientActor.cookie);
  check(supersededDenied.status === 404, "Superseded document overrides active share");
  const pending = await admin.from("student_documents").update({ superseded_at: null, scan_status: "pending" }).eq("id", documentId);
  if (pending.error) throw pending.error;
  const pendingDenied = await api(`/api/premium/documents/${documentId}`, recipientActor.cookie);
  check(pendingDenied.status === 404, "Non-clean document overrides active share");
} finally {
  await admin.from("document_shares").delete().eq("document_id", documentId);
  await admin.storage.from("student-documents").remove([path]);
  await admin.from("student_documents").delete().in("id", [documentId, siblingId]);
  await admin.from("student_document_requirements").delete().eq("id", requirementId);
}

console.log(`Phase 4E Preview integration passed ${checks.length} checks`);
