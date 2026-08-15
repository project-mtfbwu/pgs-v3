import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createAdminClient,
  createServerClient,
  requirePremiumActor,
  requireStaffPermission
} = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createServerClient: vi.fn(),
  requirePremiumActor: vi.fn(),
  requireStaffPermission: vi.fn()
}));

vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: createAdminClient }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: createServerClient }));
vi.mock("@/lib/staff-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/staff-auth")>("@/lib/staff-auth");
  return { ...actual, requireStaffPermission };
});
vi.mock("@/lib/premium-workspace", async () => {
  const actual = await vi.importActual<typeof import("@/lib/premium-workspace")>("@/lib/premium-workspace");
  return { ...actual, requirePremiumActor };
});
vi.mock("@/lib/audit", () => ({ recordDeniedAuditEvent: vi.fn().mockResolvedValue(true) }));

import { POST as createShare } from "@/app/api/premium/documents/[id]/shares/route";
import { DELETE as revokeShare } from "@/app/api/premium/documents/[id]/shares/[shareId]/route";
import { StaffAuthorizationError } from "@/lib/staff-auth";

const documentId = "55000000-0000-4000-8000-000000000005";
const shareId = "66000000-0000-4000-8000-000000000006";
const studentId = "11000000-0000-4000-8000-000000000001";
const recipientId = "44000000-0000-4000-8000-000000000004";

function adminDocumentClient() {
  const query = {
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data: { student_id: studentId }, error: null })
  };
  return { from: vi.fn(() => ({ select: vi.fn(() => query) })) };
}

describe("Phase 4E share management routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireStaffPermission.mockResolvedValue({ user: { id: "admin" } });
    requirePremiumActor.mockResolvedValue({
      user: { id: "admin" },
      kind: "admin",
      studentId
    });
    createAdminClient.mockReturnValue(adminDocumentClient());
  });

  it("creates an exact-document share through the trusted RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ share_id: shareId, share_expires_at: "2026-08-22T00:00:00Z", regranted: false }],
      error: null
    });
    createServerClient.mockResolvedValue({ rpc });

    const response = await createShare(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ recipient_user_id: recipientId })
    }), { params: Promise.resolve({ id: documentId }) });

    expect(response.status).toBe(200);
    expect(requireStaffPermission).toHaveBeenCalledWith("document_shares.manage");
    expect(requirePremiumActor).toHaveBeenCalledWith(studentId, "manage");
    expect(rpc).toHaveBeenCalledWith("create_document_share", expect.objectContaining({
      target_document: documentId,
      target_recipient: recipientId
    }));
  });

  it("denies students, mentors, and read-only staff before document access", async () => {
    requireStaffPermission.mockRejectedValue(new StaffAuthorizationError(403, "denied"));
    const response = await createShare(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ recipient_user_id: recipientId })
    }), { params: Promise.resolve({ id: documentId }) });

    expect(response.status).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("requires an Admin or Super Admin actor even after permission resolution", async () => {
    requirePremiumActor.mockResolvedValue({
      user: { id: "mentor" },
      kind: "mentor",
      studentId
    });
    const response = await createShare(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ recipient_user_id: recipientId })
    }), { params: Promise.resolve({ id: documentId }) });

    expect(response.status).toBe(403);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("rejects forged recipient IDs and expiry beyond thirty days", async () => {
    const forged = await createShare(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ recipient_user_id: "not-a-uuid" })
    }), { params: Promise.resolve({ id: documentId }) });
    expect(forged.status).toBe(400);

    const tooLate = new Date(Date.now() + 31 * 86_400_000).toISOString();
    const expired = await createShare(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ recipient_user_id: recipientId, expires_at: tooLate })
    }), { params: Promise.resolve({ id: documentId }) });
    expect(expired.status).toBe(400);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("revokes only through the trusted RPC and exact document/share pair", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: shareId, error: null });
    createServerClient.mockResolvedValue({ rpc });
    const response = await revokeShare(
      new Request("http://localhost", { method: "DELETE" }),
      { params: Promise.resolve({ id: documentId, shareId }) }
    );

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("revoke_document_share", {
      target_document: documentId,
      target_share: shareId
    });
  });
});
