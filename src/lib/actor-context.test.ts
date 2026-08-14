import { describe,expect,it,vi } from "vitest";
import type { User } from "@supabase/supabase-js";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:vi.fn()}));
import { composeActorContext } from "@/lib/actor-context";
import type { StaffContext } from "@/lib/staff-auth";
import type { StudentProfile } from "@/lib/student-data";

const user={id:"10000000-0000-4000-8000-000000000001",email:"dual@example.test"} as User;
const profile={id:user.id,full_name:"Dual",dial_code:null,phone:null,whatsapp:null,citizenship_country:null,preferred_study_country:null,study_level:null,field_interest:null,work_experience:null,referral_code:null,avatar_path:null,profile_completed_at:null} satisfies StudentProfile;
const staff={user,displayName:"Dual staff",status:"active",roles:["admin"],permissions:new Set(["catalog.manage"])} satisfies StaffContext;

describe("actor context boundary",()=>{
  it("represents student and staff as separate contexts for one Auth identity",()=>{
    const actor=composeActorContext(user,profile,staff);
    expect(actor.authenticated).toBe(true);
    if(!actor.authenticated)throw new Error("expected authenticated actor");
    expect(actor.student?.profile).toBe(profile);
    expect(actor.staff).toBe(staff);
    expect(actor.student).not.toHaveProperty("permissions");
  });

  it("does not fabricate student context for staff-only identities",()=>{
    const actor=composeActorContext(user,null,staff);
    expect(actor.authenticated&&actor.student).toBeNull();
    expect(actor.authenticated&&actor.staff?.permissions.has("catalog.manage")).toBe(true);
  });
});
