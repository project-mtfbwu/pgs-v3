import { createClient } from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;const password=process.env.PGS_PREVIEW_FIXTURE_PASSWORD;
if(process.env.PGS_PREVIEW_FIXTURES!=="I_UNDERSTAND_PREVIEW_ONLY")throw new Error("Set PGS_PREVIEW_FIXTURES=I_UNDERSTAND_PREVIEW_ONLY.");
if(!url||!key||!password||password.length<16)throw new Error("Preview Supabase URL, server key, and a 16+ character fixture password are required.");
const host=new URL(url).hostname;const local=/^(127\.0\.0\.1|localhost)$/.test(host);const projectRef=host.split(".")[0];
if(!local&&process.env.PGS_PREVIEW_PROJECT_REF!==projectRef)throw new Error("Refusing non-local fixture creation without an exact PGS_PREVIEW_PROJECT_REF match.");
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const definitions=[
  ["student-a","student"],["student-b","student"],["mentor-a","mentor"],["mentor-b","mentor"],["viewer","viewer"],["admin","admin"],["super-admin","super_admin"]
];
const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});if(listed.error)throw listed.error;const users=new Map(listed.data.users.map((user)=>[user.email,user]));
for(const [name,role] of definitions){const email=`pgs-v3-fixture+${name}@example.test`;let user=users.get(email);if(!user){const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:`Fixture ${name}`}});if(created.error)throw created.error;user=created.data.user;}if(role!=="student"){const profile=await admin.from("staff_profiles").upsert({user_id:user.id,role,display_name:`Fixture ${name}`,status:"active"});if(profile.error)throw profile.error;const roleRow=await admin.from("staff_roles").select("id").eq("key",role).single();if(roleRow.error)throw roleRow.error;const assignment=await admin.from("staff_role_assignments").upsert({staff_user_id:user.id,role_id:roleRow.data.id,reason:"Preview-only fixture"},{onConflict:"staff_user_id,role_id",ignoreDuplicates:true});if(assignment.error)throw assignment.error;}users.set(email,user);}
const studentA=users.get("pgs-v3-fixture+student-a@example.test");const mentorA=users.get("pgs-v3-fixture+mentor-a@example.test");const superAdmin=users.get("pgs-v3-fixture+super-admin@example.test");if(!studentA||!mentorA||!superAdmin)throw new Error("Fixture identity creation failed.");
const premium=await admin.rpc("activate_premium_purchase",{target_student:studentA.id,provider_name:"preview-fixture",purchase_reference:`fixture:${studentA.id}`,event_reason:"Preview-only fixture"});if(premium.error)throw premium.error;
const existing=await admin.from("mentor_assignments").select("id").eq("student_id",studentA.id).eq("status","active").maybeSingle();if(!existing.data){const assignment=await admin.from("mentor_assignments").insert({mentor_id:mentorA.id,student_id:studentA.id,assigned_by:superAdmin.id,reason:"Preview-only fixture"});if(assignment.error)throw assignment.error;}
console.log("Preview-only Batch 4 role fixtures are ready. No credentials were written to disk.");
