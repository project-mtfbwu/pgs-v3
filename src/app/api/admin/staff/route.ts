import { NextResponse } from "next/server";
import { adminApiError } from "@/lib/admin-api";
import { readJsonObject } from "@/lib/http";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request:Request){
  let invitedUserId:string|null=null;
  try{
    await requireStaffPermission("roles.manage");const input=await readJsonObject(request);const action=String(input.action??"assign");let userId=typeof input.user_id==="string"?input.user_id:"";
    if(action==="invite"){
      if(typeof input.email!=="string"||!/^\S+@\S+\.\S+$/.test(input.email))throw new Error("Enter a valid staff email.");
      const admin=createSupabaseAdminClient();const {data,error}=await admin.auth.admin.inviteUserByEmail(input.email,{data:{invited_for:"pgs_staff"}});if(error||!data.user)throw new Error("Unable to invite the staff user. Check preview SMTP and server configuration.");userId=data.user.id;invitedUserId=userId;
    }
    if(!/^[0-9a-f-]{36}$/i.test(userId)||!["super_admin","admin","mentor","viewer"].includes(String(input.role)))throw new Error("Invalid staff access change.");
    const supabase=await createSupabaseServerClient();const {data,error}=await supabase.rpc("manage_staff_access",{target_user:userId,target_role:input.role,target_active:action!=="revoke",target_status:typeof input.status==="string"?input.status:"active",target_display_name:typeof input.display_name==="string"?input.display_name.slice(0,255):"",event_reason:typeof input.reason==="string"?input.reason.slice(0,1000):null});
    if(error){if(invitedUserId)await createSupabaseAdminClient().auth.admin.deleteUser(invitedUserId);throw new Error("The staff role change was denied.");}
    return NextResponse.json({ok:true,assignment_id:data,user_id:userId});
  }catch(error){return adminApiError(error);}
}

