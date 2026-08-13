import { beforeAll,describe,expect,it,vi } from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:vi.fn()}));
let rolePermissions:typeof import("@/lib/staff-auth").rolePermissions;
beforeAll(async()=>{rolePermissions=(await import("@/lib/staff-auth")).rolePermissions;});
describe("normalized staff role intent",()=>{
  it("keeps Viewer read-only",()=>{expect(rolePermissions.viewer).toContain("catalog.read");expect(rolePermissions.viewer).not.toContain("catalog.manage");expect(rolePermissions.viewer).not.toContain("premium.manage");expect(rolePermissions.viewer).not.toContain("roles.manage");});
  it("keeps Mentor assignment-scoped and out of CMS/catalog",()=>{expect(rolePermissions.mentor).toContain("student_workspace.read");expect(rolePermissions.mentor).not.toContain("student_workspace.read_all");expect(rolePermissions.mentor).not.toContain("catalog.manage");expect(rolePermissions.mentor).not.toContain("cms.manage");});
  it("prevents Admin role governance while Super Admin has it",()=>{expect(rolePermissions.admin).not.toContain("roles.manage");expect(rolePermissions.super_admin).toContain("roles.manage");expect(rolePermissions.super_admin).toContain("audit.read");});
});
