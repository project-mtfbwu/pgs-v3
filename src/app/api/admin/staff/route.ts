import { NextResponse } from "next/server";
import { adminApiError } from "@/lib/admin-api";
import { recordDeniedAuditEvent, recordFailedAuditEvent } from "@/lib/audit";
import { readJsonObject, validUuid } from "@/lib/http";
import { requireStaffPermission, StaffAuthorizationError } from "@/lib/staff-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request:Request){
  let invitedUserId:string|null=null;
  let targetUserId:string|undefined;
  let authorized=false;
  try{
    await requireStaffPermission("roles.manage");authorized=true;const input=await readJsonObject(request);const action=String(input.action??"assign");if(!["invite","assign","revoke"].includes(action))throw new Error("Invalid staff access action.");let userId=typeof input.user_id==="string"?input.user_id:"";targetUserId=userId||undefined;
    if(action==="invite"){
      if(typeof input.email!=="string"||input.email.length>320||!/^\S+@\S+\.\S+$/.test(input.email))throw new Error("Enter a valid staff email.");
      const admin=createSupabaseAdminClient();const {data,error}=await admin.auth.admin.inviteUserByEmail(input.email.trim().toLowerCase(),{data:{invited_for:"pgs_staff",pgs_context:"staff"}});if(error||!data.user)throw new Error("Unable to invite the staff user. Check preview SMTP and server configuration.");userId=data.user.id;invitedUserId=userId;
      targetUserId=userId;
    }
    const requestedRole=String(input.role);const canonicalRole=requestedRole==="viewer"?"read_only_staff":requestedRole;
    if(!validUuid(userId)||!["super_admin","admin","mentor","read_only_staff"].includes(canonicalRole)||!["active","suspended","ended"].includes(String(input.status??"active")))throw new Error("Invalid staff access change.");
    const supabase=await createSupabaseServerClient();const {data,error}=await supabase.rpc("manage_staff_access",{target_user:userId,target_role:canonicalRole,target_active:action!=="revoke",target_status:typeof input.status==="string"?input.status:"active",target_display_name:typeof input.display_name==="string"?input.display_name.slice(0,255):"",event_reason:typeof input.reason==="string"?input.reason.slice(0,1000):null});
    if(error){
      if(invitedUserId)await createSupabaseAdminClient().auth.admin.deleteUser(invitedUserId);
      await recordDeniedAuditEvent(request,{
        eventType:"staff.access.denied",sourceSubsystem:"staff",
        targetType:"staff_user",targetId:targetUserId,
        metadata:{permission_required:"roles.manage",reason_code:"database_denied",route:"/api/admin/staff"}
      });
      return adminApiError(new StaffAuthorizationError(403,"The staff role change was denied."));
    }
    return NextResponse.json({ok:true,assignment_id:data,user_id:userId});
  }catch(error){
    if(error instanceof StaffAuthorizationError){
      await recordDeniedAuditEvent(request,{
        eventType:"staff.access.denied",sourceSubsystem:"staff",
        targetType:"staff_user",targetId:targetUserId,
        metadata:{permission_required:"roles.manage",reason_code:error.status===401?"staff_context_required":"permission_denied",route:"/api/admin/staff"}
      });
    }else if(authorized){
      await recordFailedAuditEvent(request,{
        eventType:"staff.access.failed",sourceSubsystem:"staff",
        targetType:"staff_user",targetId:targetUserId,
        metadata:{reason_code:"request_failed",route:"/api/admin/staff"}
      });
    }
    return adminApiError(error);
  }
}
