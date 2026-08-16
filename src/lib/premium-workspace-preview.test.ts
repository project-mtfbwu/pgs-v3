import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  adminFrom: vi.fn(),
  sessionFrom: vi.fn(),
  previewTarget: null as string | null,
  log: [] as Array<{ client: "admin" | "session"; table: string; studentId?: string }>
}));

function query(client: "admin" | "session", table: string) {
  let studentId: string | undefined;
  const api = {
    select() { return api; },
    eq(column: string, value: string) {
      if (column === "student_id" || column === "id") studentId = value;
      return api;
    },
    order() { return api; },
    limit() { return api; },
    maybeSingle() {
      mocks.log.push({ client, table, studentId });
      return Promise.resolve({ data: null });
    },
    then(resolve: (value: { data: unknown[] }) => unknown, reject?: (reason: unknown) => unknown) {
      mocks.log.push({ client, table, studentId });
      return Promise.resolve({ data: [] }).then(resolve, reject);
    }
  };
  return api;
}

vi.mock("server-only", () => ({}));
vi.mock("@/lib/staff-preview-server", () => ({
  getActiveStudentPreviewTargetId: async () => mocks.previewTarget
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      mocks.adminFrom(table);
      return query("admin", table);
    }
  })
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    from: (table: string) => {
      mocks.sessionFrom(table);
      return query("session", table);
    }
  })
}));
vi.mock("@/lib/student-access", () => ({
  getStudentPremiumStatus: vi.fn(),
  requireStudentViewer: vi.fn(),
  StudentAccessError: class StudentAccessError extends Error {}
}));

import { loadPremiumWorkspace } from "@/lib/premium-workspace";

const studentA = "c4100000-0000-4000-8000-000000000001";
const studentB = "c4200000-0000-4000-8000-000000000002";

describe("Premium workspace subject loaders", () => {
  beforeEach(() => {
    mocks.log.length = 0;
    mocks.previewTarget = null;
    mocks.adminFrom.mockClear();
    mocks.sessionFrom.mockClear();
  });

  it("loads Premium preview workspace through the admin client constrained to the target student", async () => {
    mocks.previewTarget = studentA;
    const workspace = await loadPremiumWorkspace(studentA);
    expect(workspace.studentId).toBe(studentA);
    expect(mocks.sessionFrom).not.toHaveBeenCalled();
    expect(mocks.adminFrom).toHaveBeenCalled();
    expect(mocks.log.every((entry) => entry.client === "admin")).toBe(true);
    expect(mocks.log.some((entry) => entry.table === "premium_workspace_profiles" && entry.studentId === studentA)).toBe(true);
    expect(mocks.log.some((entry) => entry.table === "mentor_assignments" && entry.studentId === studentA)).toBe(true);
    expect(mocks.log.some((entry) => entry.table === "student_document_requirements" && entry.studentId === studentA)).toBe(true);
    expect(mocks.log.every((entry) => entry.studentId === studentA)).toBe(true);
  });

  it("keeps ordinary Premium and Standard workspace loads on the session client", async () => {
    await loadPremiumWorkspace(studentA);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
    expect(mocks.sessionFrom).toHaveBeenCalled();
    expect(mocks.log.every((entry) => entry.client === "session" && entry.studentId === studentA)).toBe(true);

    mocks.log.length = 0;
    mocks.sessionFrom.mockClear();
    await loadPremiumWorkspace(studentB);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
    expect(mocks.log.every((entry) => entry.client === "session" && entry.studentId === studentB)).toBe(true);
  });
});
