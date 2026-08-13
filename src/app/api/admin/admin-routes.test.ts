import { beforeEach,describe,expect,it,vi } from "vitest";
const { requirePermission }=vi.hoisted(()=>({requirePermission:vi.fn()}));
vi.mock("@/lib/staff-auth",async()=>{const actual=await vi.importActual<typeof import("@/lib/staff-auth")>("@/lib/staff-auth");return {...actual,requireStaffPermission:requirePermission};});
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:vi.fn()}));
vi.mock("@/lib/supabase/admin",()=>({createSupabaseAdminClient:vi.fn()}));
import { POST as catalogPost } from "@/app/api/admin/catalog/[entity]/route";
import { POST as contentPost } from "@/app/api/admin/content/[module]/route";
import { POST as staffPost } from "@/app/api/admin/staff/route";
import { StaffAuthorizationError } from "@/lib/staff-auth";

describe("direct staff API privilege escalation",()=>{
  beforeEach(()=>{vi.clearAllMocks();});
  it.each([
    ["Viewer catalog POST",catalogPost,new Request("http://localhost/api/admin/catalog/courses",{method:"POST",body:JSON.stringify({title:"Attack",slug:"attack"})}),{params:Promise.resolve({entity:"courses"})}],
    ["Mentor content POST",contentPost,new Request("http://localhost/api/admin/content/faqs",{method:"POST",body:JSON.stringify({scope:"x",question:"x",answer:"x"})}),{params:Promise.resolve({module:"faqs"})}],
  ])("denies %s before data access",async(_label,handler,request,context)=>{requirePermission.mockRejectedValue(new StaffAuthorizationError(403,"denied"));const response=await handler(request,context as never);expect(response.status).toBe(403);});
  it("denies an Admin self-promotion payload before Auth administration",async()=>{requirePermission.mockRejectedValue(new StaffAuthorizationError(403,"denied"));const response=await staffPost(new Request("http://localhost/api/admin/staff",{method:"POST",body:JSON.stringify({action:"assign",user_id:"10000000-0000-4000-8000-000000000001",role:"super_admin"})}));expect(response.status).toBe(403);});
});
