import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE URL and SERVICE_ROLE_KEY are required");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const scanPoll = Number(process.env.SCAN_POLL_MS ?? 5000);
const purgePoll = Number(process.env.PURGE_POLL_MS ?? 60000);
const bucket = "student-documents";

function validSignature(bytes, mime) {
  if (!mime || bytes.length < 4) return false;
  if (mime === "application/pdf") return Buffer.from(bytes.slice(0, 5)).toString("utf8") === "%PDF-";
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  }
  const names = Buffer.from(bytes).toString("latin1");
  if (mime === "application/msword") {
    return [0xd0, 0xcf, 0x11, 0xe0].every((value, index) => bytes[index] === value) && names.includes("WordDocument");
  }
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
    && names.includes("[Content_Types].xml")
    && names.includes("word/");
}

function clamVerdict(filePath) {
  const result = spawnSync("clamdscan", ["--no-summary", filePath], { encoding: "utf8" });
  if (result.error) {
    const fallback = spawnSync("clamscan", ["--no-summary", filePath], { encoding: "utf8" });
    if (fallback.error) throw fallback.error;
    if (fallback.status === 0) return "clean";
    if (fallback.status === 1) return "blocked";
    throw new Error(`clamscan failed: ${fallback.stderr || fallback.stdout}`);
  }
  if (result.status === 0) return "clean";
  if (result.status === 1) return "blocked";
  throw new Error(`clamdscan failed: ${result.stderr || result.stdout}`);
}

async function scanPending() {
  const { data: docs, error } = await supabase
    .from("student_documents")
    .select("id,storage_path,mime_type,sha256,scan_status,scan_detail_code,purged_at,storage_purged_at")
    .in("scan_status", ["pending", "failed"])
    .is("purged_at", null)
    .order("uploaded_at", { ascending: true })
    .limit(10);
  if (error) throw error;

  for (const doc of docs ?? []) {
    if (
      doc.scan_status === "failed"
      && !["scanner_unavailable", "download_failed"].includes(doc.scan_detail_code)
    ) {
      continue;
    }
    const dir = mkdtempSync(join(tmpdir(), "pgs-scan-"));
    const filePath = join(dir, "object.bin");
    try {
      const { data: blob, error: downloadError } = await supabase.storage.from(bucket).download(doc.storage_path);
      if (downloadError || !blob) {
        if (doc.scan_status === "pending") {
          await supabase.rpc("set_document_scan_result", {
            target_document: doc.id,
            verdict: "failed",
            detail_code: "download_failed"
          });
        }
        continue;
      }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const hash = createHash("sha256").update(bytes).digest("hex");
      if (hash !== doc.sha256 || !validSignature(bytes, doc.mime_type)) {
        if (doc.scan_status === "pending") {
          await supabase.rpc("set_document_scan_result", {
            target_document: doc.id,
            verdict: "failed",
            detail_code: "signature_or_hash_mismatch"
          });
        }
        continue;
      }
      writeFileSync(filePath, bytes);
      let verdict;
      try {
        verdict = clamVerdict(filePath);
      } catch {
        if (doc.scan_status === "pending") {
          await supabase.rpc("set_document_scan_result", {
            target_document: doc.id,
            verdict: "failed",
            detail_code: "scanner_unavailable"
          });
        }
        continue;
      }
      const { data: blockedPath, error: verdictError } = await supabase.rpc("set_document_scan_result", {
        target_document: doc.id,
        verdict,
        detail_code: verdict === "blocked" ? "clamav_detection" : null
      });
      if (verdictError) throw verdictError;
      if (verdict === "blocked" && typeof blockedPath === "string") {
        const removed = await supabase.storage.from(bucket).remove([blockedPath]);
        if (!removed.error) {
          await supabase.rpc("mark_student_document_storage_purged", { target_document: doc.id });
        }
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
}

async function purgeBlockedBytes() {
  const { data: blocked, error } = await supabase
    .from("student_documents")
    .select("id,storage_path")
    .eq("scan_status", "blocked")
    .is("storage_purged_at", null)
    .limit(25);
  if (error) throw error;
  for (const row of blocked ?? []) {
    const removed = await supabase.storage.from(bucket).remove([row.storage_path]);
    if (removed.error) {
      console.error("blocked byte removal failed", row.id, removed.error.message);
      continue;
    }
    const { error: completeError } = await supabase.rpc(
      "mark_student_document_storage_purged",
      { target_document: row.id }
    );
    if (completeError) {
      console.error("blocked byte completion failed", row.id, completeError.message);
    }
  }
}

async function purgeArchived() {
  const { data: due, error } = await supabase.rpc("claim_documents_due_for_purge", { batch_limit: 25 });
  if (error) throw error;
  for (const row of due ?? []) {
    const removed = await supabase.storage.from(bucket).remove([row.storage_path]);
    if (removed.error) {
      console.error("purge storage failed", row.document_id, removed.error.message);
      continue;
    }
    const { error: completeError } = await supabase.rpc("complete_document_purge", {
      target_document: row.document_id,
      storage_removed: true
    });
    if (completeError) console.error("purge complete failed", row.document_id, completeError.message);
  }
}

async function cleanupAbandonedSessions() {
  const { data: abandoned, error } = await supabase.rpc("claim_abandoned_upload_sessions", { batch_limit: 50 });
  if (error) throw error;
  for (const row of abandoned ?? []) {
    const removed = await supabase.storage.from(bucket).remove([row.storage_path]);
    if (removed.error) {
      console.error("abandoned cleanup failed", row.session_id, removed.error.message);
      continue;
    }
    const { error: completeError } = await supabase.rpc(
      "complete_abandoned_upload_session_cleanup",
      { target_session: row.session_id }
    );
    if (completeError) {
      console.error("abandoned cleanup completion failed", row.session_id, completeError.message);
    }
  }
}

async function tickScan() {
  try { await scanPending(); }
  catch (error) { console.error("scan tick failed", error); }
}

async function tickMaintenance() {
  try {
    await purgeBlockedBytes();
    await purgeArchived();
    await cleanupAbandonedSessions();
  } catch (error) {
    console.error("maintenance tick failed", error);
  }
}

console.log("PGS document security worker started");
await tickScan();
await tickMaintenance();
setInterval(() => { void tickScan(); }, scanPoll);
setInterval(() => { void tickMaintenance(); }, purgePoll);
