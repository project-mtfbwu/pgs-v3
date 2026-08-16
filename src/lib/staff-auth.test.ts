import { describe,expect,it,vi } from "vitest";
import type { User } from "@supabase/supabase-js";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:vi.fn()}));
import { buildStaffContext,normalizeStaffRoleKey } from "@/lib/staff-auth";

const user={id:"10000000-0000-4000-8000-000000000001",email:"staff@example.test"} as User;
function assignment(role:string,permissions:string[]){return {staff_roles:{key:role,staff_role_permissions:permissions.map((key)=>({staff_permissions:{key}}))}};}

describe("database-backed staff authorization",()=>{
  it("uses only permission rows returned by the database",()=>{
    const context=buildStaffContext(user,{display_name:"Read-only",status:"active"},[
      assignment("read_only_staff",["overview.read","students.read"])
    ]);
    expect([...context!.permissions]).toEqual(["overview.read","students.read"]);
    expect(context!.permissions.has("catalog.read")).toBe(false);
    expect(context!.permissions.has("cms.read")).toBe(false);
    expect(context!.permissions.has("catalog.manage")).toBe(false);
    expect(context!.permissions.has("premium.manage")).toBe(false);
    expect(context!.permissions.has("roles.manage")).toBe(false);
  });

  it("changes effective access when DB grant rows change without a TS role matrix",()=>{
    const before=buildStaffContext(user,{display_name:null,status:"active"},[assignment("admin",["catalog.read"])]);
    const after=buildStaffContext(user,{display_name:null,status:"active"},[assignment("admin",["catalog.read","catalog.manage"])]);
    expect(before!.permissions.has("catalog.manage")).toBe(false);
    expect(after!.permissions.has("catalog.manage")).toBe(true);
  });

  it("normalizes the temporary viewer alias but exposes only the canonical role",()=>{
    expect(normalizeStaffRoleKey("viewer")).toBe("read_only_staff");
    expect(buildStaffContext(user,{display_name:null,status:"active"},[assignment("viewer",["catalog.read"])])!.roles).toEqual(["read_only_staff"]);
  });

  it("denies inactive staff even when assignment rows exist",()=>{
    expect(buildStaffContext(user,{display_name:null,status:"suspended"},[assignment("super_admin",["roles.manage"])])).toBeNull();
  });
});
