import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePremiumActor: vi.fn(),
  createServerClient: vi.fn(),
  createAdminClient: vi.fn(),
  consumeRateLimit: vi.fn(),
  logServerError: vi.fn()
}));

vi.mock("@/lib/premium-workspace", async () => {
  const actual = await vi.importActual<typeof import("@/lib/premium-workspace")>(
    "@/lib/premium-workspace"
  );
  return { ...actual, requirePremiumActor: mocks.requirePremiumActor };
});
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createServerClient
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createAdminClient
}));
vi.mock("@/lib/server-security", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  logServerError: mocks.logServerError
}));

import { POST as authorizeUpload } from "@/app/api/premium/documents/upload-session/route";
import {
  DELETE as cancelUpload,
  POST as finalizeUpload
} from "@/app/api/premium/documents/finalize/route";
import { POST as retiredMultipartUpload } from "@/app/api/premium/documents/route";
import { MAX_STUDENT_DOCUMENT_BYTES } from "@/lib/document-access";

const studentId = "11000000-0000-4000-8000-000000000001";
const requirementId = "22000000-0000-4000-8000-000000000002";
const sessionId = "33000000-0000-4000-8000-000000000003";
const objectId = "44000000-0000-4000-8000-000000000004";
const objectPath = `${studentId}/${requirementId}/${objectId}.pdf`;

function jsonRequest(url: string, method: "POST" | "DELETE", body: object) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function requirementQuery(found = true) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({
      data: found ? { id: requirementId } : null,
      error: null
    })
  };
  return query;
}

describe("Phase 4D staged direct upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePremiumActor.mockResolvedValue({
      user: { id: studentId },
      kind: "student",
      studentId
    });
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true, configured: true });
  });

  it("retires multipart document bodies through Vercel", async () => {
    const response = await retiredMultipartUpload();
    expect(response.status).toBe(410);
  });

  it("rejects files larger than 50 MB before issuing storage authority", async () => {
    const response = await authorizeUpload(jsonRequest(
      "http://localhost/api/premium/documents/upload-session",
      "POST",
      {
        requirement_id: requirementId,
        filename: "passport.pdf",
        mime_type: "application/pdf",
        byte_size: MAX_STUDENT_DOCUMENT_BYTES + 1
      }
    ));
    expect(response.status).toBe(400);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects a filename extension that disagrees with MIME", async () => {
    const response = await authorizeUpload(jsonRequest(
      "http://localhost/api/premium/documents/upload-session",
      "POST",
      {
        requirement_id: requirementId,
        filename: "passport.docx",
        mime_type: "application/pdf",
        byte_size: 1024
      }
    ));
    expect(response.status).toBe(400);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("does not authorize another student's requirement", async () => {
    const query = requirementQuery(false);
    mocks.createServerClient.mockResolvedValue({
      from: vi.fn(() => query)
    });
    const response = await authorizeUpload(jsonRequest(
      "http://localhost/api/premium/documents/upload-session",
      "POST",
      {
        requirement_id: requirementId,
        filename: "passport.pdf",
        mime_type: "application/pdf",
        byte_size: 1024
      }
    ));
    expect(response.status).toBe(404);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("returns only the server-issued canonical path with overwrite disabled", async () => {
    const query = requirementQuery(true);
    const rpc = vi.fn().mockResolvedValue({
      data: [{ session_id: sessionId, object_path: objectPath }],
      error: null
    });
    const createSignedUploadUrl = vi.fn().mockResolvedValue({
      data: { token: "signed-upload-token", path: objectPath },
      error: null
    });
    mocks.createServerClient.mockResolvedValue({
      from: vi.fn(() => query),
      rpc
    });
    mocks.createAdminClient.mockReturnValue({
      storage: { from: vi.fn(() => ({ createSignedUploadUrl })) }
    });

    const response = await authorizeUpload(jsonRequest(
      "http://localhost/api/premium/documents/upload-session",
      "POST",
      {
        requirement_id: requirementId,
        filename: "passport.pdf",
        mime_type: "application/pdf",
        byte_size: MAX_STUDENT_DOCUMENT_BYTES
      }
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.path).toBe(objectPath);
    expect(body.upsert).toBe(false);
    expect(createSignedUploadUrl).toHaveBeenCalledWith(objectPath, { upsert: false });
    expect(rpc).toHaveBeenCalledWith("create_document_upload_session", expect.objectContaining({
      target_requirement: requirementId,
      declared_size: MAX_STUDENT_DOCUMENT_BYTES
    }));
  });

  it("finalizes only an owned issued session and server-observed object size", async () => {
    const sessionQuery = {
      select: vi.fn(() => sessionQuery),
      eq: vi.fn(() => sessionQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: sessionId,
          storage_path: objectPath,
          declared_byte_size: 2048,
          finalized_document_id: null,
          canceled_at: null,
          expires_at: new Date(Date.now() + 60_000).toISOString()
        },
        error: null
      })
    };
    const rpc = vi.fn().mockResolvedValue({
      data: "55000000-0000-4000-8000-000000000005",
      error: null
    });
    mocks.createServerClient.mockResolvedValue({
      from: vi.fn(() => sessionQuery),
      rpc
    });
    mocks.createAdminClient.mockReturnValue({
      storage: {
        from: vi.fn(() => ({
          list: vi.fn().mockResolvedValue({
            data: [{ name: `${objectId}.pdf`, metadata: { size: 2048 } }],
            error: null
          })
        }))
      }
    });

    const response = await finalizeUpload(jsonRequest(
      "http://localhost/api/premium/documents/finalize",
      "POST",
      { session_id: sessionId, sha256: "a".repeat(64) }
    ));

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("finalize_student_document", {
      target_session: sessionId,
      file_sha256: "a".repeat(64),
      detected_size: 2048
    });
  });

  it("keeps a canceled session retryable when Storage cleanup fails", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: objectPath, error: null });
    mocks.createServerClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: studentId } } }) },
      rpc
    });
    mocks.createAdminClient.mockReturnValue({
      storage: {
        from: vi.fn(() => ({
          remove: vi.fn().mockResolvedValue({ error: new Error("storage unavailable") })
        }))
      }
    });

    const response = await cancelUpload(jsonRequest(
      "http://localhost/api/premium/documents/finalize",
      "DELETE",
      { session_id: sessionId }
    ));

    expect(response.status).toBe(503);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalledWith(
      "complete_document_upload_session_cancel",
      expect.anything()
    );
  });
});
