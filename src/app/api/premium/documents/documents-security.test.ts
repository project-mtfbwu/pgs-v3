import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAdminClient, createServerClient, requirePremiumActor } = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createServerClient: vi.fn(),
  requirePremiumActor: vi.fn()
}));

vi.mock("@/lib/premium-workspace", async () => {
  const actual = await vi.importActual<typeof import("@/lib/premium-workspace")>("@/lib/premium-workspace");
  return { ...actual, requirePremiumActor };
});
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: createServerClient }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: createAdminClient }));
vi.mock("@/lib/server-security", () => ({ logServerError: vi.fn() }));
vi.mock("@/lib/audit",()=>({
  recordDeniedAuditEvent:vi.fn().mockResolvedValue(true),
  recordFailedAuditEvent:vi.fn().mockResolvedValue(true),
  recordPrivilegedReadAuditEvent:vi.fn().mockResolvedValue(undefined)
}));

import { GET as downloadDocument } from "@/app/api/premium/documents/[id]/route";
import { PATCH as reviewDocument } from "@/app/api/staff/students/[studentId]/workspace/[resource]/route";
import { WorkspaceAccessError } from "@/lib/premium-workspace";

const studentA = "11000000-0000-4000-8000-000000000001";
const studentB = "22000000-0000-4000-8000-000000000002";
const documentId = "55000000-0000-4000-8000-000000000005";

function documentReadClient(scanStatus: string, owner = studentA) {
  const filters = new Map<string, unknown>();
  const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: "https://storage.test/signed" }, error: null });
  const query = {
    eq: vi.fn((column: string, value: unknown) => { filters.set(column, value); return query; }),
    maybeSingle: vi.fn(async () => ({
      data: filters.get("id") === documentId && filters.get("student_id") === owner
        ? { storage_path: `${owner}/requirement/file.pdf`, original_filename: "file.pdf", scan_status: scanStatus }
        : null,
      error: null
    }))
  };
  return {
    client: {
      from: vi.fn(() => ({ select: vi.fn(() => query) })),
      storage: { from: vi.fn(() => ({ createSignedUrl })) }
    },
    createSignedUrl,
    filters
  };
}

function documentReviewClient(scanStatus: string, owner = studentA) {
  const filters = new Map<string, unknown>();
  const query = {
    eq: vi.fn((column: string, value: unknown) => { filters.set(column, value); return query; }),
    select: vi.fn(() => query),
    maybeSingle: vi.fn(async () => {
      const matches = filters.get("id") === documentId && filters.get("student_id") === owner;
      const passesCleanGate = !filters.has("scan_status") || filters.get("scan_status") === scanStatus;
      return { data: matches && passesCleanGate ? { id: documentId } : null, error: null };
    })
  };
  const update = vi.fn(() => query);
  return { client: { from: vi.fn(() => ({ update })) }, filters, update };
}

describe("Phase 4-0 clean document access gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePremiumActor.mockResolvedValue({
      user: { id: studentA }, kind: "student", studentId: studentA
    });
  });

  it("denies a signed URL for an authorized but non-clean document", async () => {
    const { client, createSignedUrl } = documentReadClient("pending");
    createServerClient.mockResolvedValue(client);

    const response = await downloadDocument(new Request("http://localhost"), { params: Promise.resolve({ id: documentId }) });

    expect(response.status).toBe(404);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("allows a signed URL only for an authorized clean document", async () => {
    const { client, createSignedUrl } = documentReadClient("clean");
    createServerClient.mockResolvedValue(client);

    const response = await downloadDocument(new Request("http://localhost"), { params: Promise.resolve({ id: documentId }) });

    expect(response.status).toBe(200);
    expect(createSignedUrl).toHaveBeenCalledOnce();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("denies a guessed cross-student document before any Storage operation", async () => {
    const { client, createSignedUrl } = documentReadClient("clean", studentB);
    createServerClient.mockResolvedValue(client);

    const response = await downloadDocument(new Request("http://localhost"), { params: Promise.resolve({ id: documentId }) });

    expect(response.status).toBe(404);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("denies normal staff review for a non-clean document", async () => {
    requirePremiumActor.mockResolvedValue({ user: { id: "33000000-0000-4000-8000-000000000003" }, kind: "mentor", studentId: studentA });
    const { client, filters } = documentReviewClient("pending");
    createServerClient.mockResolvedValue(client);

    const response = await reviewDocument(new Request("http://localhost", {
      method: "PATCH", body: JSON.stringify({ id: documentId, qc_status: "approved" })
    }), { params: Promise.resolve({ studentId: studentA, resource: "documents" }) });

    expect(response.status).toBe(404);
    expect(filters.get("scan_status")).toBe("clean");
  });

  it("allows authorized staff to review an in-scope clean document", async () => {
    requirePremiumActor.mockResolvedValue({ user: { id: "33000000-0000-4000-8000-000000000003" }, kind: "mentor", studentId: studentA });
    const { client, filters } = documentReviewClient("clean");
    createServerClient.mockResolvedValue(client);

    const response = await reviewDocument(new Request("http://localhost", {
      method: "PATCH", body: JSON.stringify({ id: documentId, qc_status: "approved" })
    }), { params: Promise.resolve({ studentId: studentA, resource: "documents" }) });

    expect(response.status).toBe(200);
    expect(filters.get("scan_status")).toBe("clean");
  });

  it("denies an unassigned mentor before document data access", async () => {
    requirePremiumActor.mockRejectedValue(new WorkspaceAccessError(403, "This student workspace is not assigned to you."));
    const from = vi.fn();
    createServerClient.mockResolvedValue({ from });

    const response = await reviewDocument(new Request("http://localhost", {
      method: "PATCH", body: JSON.stringify({ id: documentId, qc_status: "approved" })
    }), { params: Promise.resolve({ studentId: studentB, resource: "documents" }) });

    expect(response.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });
});
