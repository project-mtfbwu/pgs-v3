"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const fieldClass = "ops:grid ops:gap-1.5 ops:text-sm ops:font-medium";
const controlClass = "ops:min-h-10 ops:w-full ops:rounded-md ops:border ops:border-input ops:bg-card ops:px-3 ops:py-2 ops:text-sm ops:outline-none ops:focus-visible:ring-2 ops:focus-visible:ring-ring";

export function AdminStaffManager({staff,canManage}:{staff:Array<Record<string,unknown>>;canManage:boolean}){
  const [message,setMessage]=useState("");
  async function send(values:Record<string,unknown>){
    setMessage("Saving…");
    const response=await fetch("/api/admin/staff",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(values)});
    const result=await response.json();
    if(!response.ok)return setMessage(result.message??"Unable to change staff access.");
    window.location.reload();
  }
  return <>
    <p className="ops:m-0 ops:text-sm ops:text-muted-foreground" role="status">{message}</p>
    {canManage&&<Card>
      <CardHeader>
        <CardTitle>Invite or assign staff access</CardTitle>
        <CardDescription>Use the existing Supabase Auth identity and relational role assignment workflow.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="ops:grid ops:gap-4 ops:md:grid-cols-2 ops:xl:grid-cols-3" onSubmit={(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);void send({action:data.get("action"),email:data.get("email"),user_id:data.get("user_id"),display_name:data.get("display_name"),role:data.get("role"),status:"active",reason:data.get("reason")});}}>
          <label className={fieldClass}>Action<select className={controlClass} name="action"><option value="invite">Invite new Auth user</option><option value="assign">Assign existing Auth UUID</option></select></label>
          <label className={fieldClass}>Email for invitation<Input name="email" type="email"/></label>
          <label className={fieldClass}>Existing user UUID<Input name="user_id" pattern="[0-9a-fA-F-]{36}"/></label>
          <label className={fieldClass}>Display name<Input name="display_name" maxLength={255}/></label>
          <label className={fieldClass}>Role<select className={controlClass} name="role"><option value="read_only_staff">Read-only staff</option><option value="mentor">Mentor / Counselor</option><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select></label>
          <label className={fieldClass}>Reason<textarea className={controlClass} name="reason" maxLength={1000}/></label>
          <div className="ops:md:col-span-2 ops:xl:col-span-3"><Button type="submit">Save access</Button></div>
        </form>
        <p className="ops:mb-0 ops:mt-4 ops:text-xs ops:text-muted-foreground">Invitations require preview SMTP and the server-only Supabase service key. No password is created here.</p>
      </CardContent>
    </Card>}
    <Card>
      <CardContent className="ops:p-0">
        <div className="ops:overflow-x-auto">
          <table className="ops:w-full ops:min-w-[800px] ops:border-collapse ops:text-left ops:text-sm">
            <thead className="ops:bg-muted/60 ops:text-xs ops:uppercase ops:tracking-wide ops:text-muted-foreground"><tr><th className="ops:px-4 ops:py-3 ops:font-semibold">Staff user</th><th className="ops:px-4 ops:py-3 ops:font-semibold">Roles</th><th className="ops:px-4 ops:py-3 ops:font-semibold">Status</th><th className="ops:px-4 ops:py-3 ops:font-semibold">Created</th>{canManage&&<th className="ops:px-4 ops:py-3 ops:font-semibold">Access actions</th>}</tr></thead>
            <tbody>{staff.map((row)=><tr className="ops:border-t ops:border-border" key={String(row.user_id)}><td className="ops:px-4 ops:py-3"><strong>{String(row.display_name||"Staff")}</strong><br/><code className="ops:text-xs ops:text-muted-foreground">{String(row.user_id)}</code></td><td className="ops:px-4 ops:py-3"><span className="ops:rounded-full ops:bg-accent ops:px-2.5 ops:py-1 ops:text-xs ops:font-medium ops:text-accent-foreground">{String(row.role).replaceAll("_"," ")}</span><br/><small className="ops:mt-2 ops:inline-block ops:text-muted-foreground">{String(row.role_history??"Current primary role")}</small></td><td className="ops:px-4 ops:py-3">{String(row.status)}</td><td className="ops:px-4 ops:py-3">{new Date(String(row.created_at)).toLocaleDateString("en-GB")}</td>{canManage&&<td className="ops:px-4 ops:py-3"><div className="ops:flex ops:flex-wrap ops:gap-2"><Button variant="outline" size="sm" onClick={()=>void send({action:"assign",user_id:row.user_id,role:row.role,status:row.status==="active"?"suspended":"active",reason:row.status==="active"?"Suspended from staff manager":"Reactivated from staff manager"})}>{row.status==="active"?"Suspend":"Reactivate"}</Button><Button variant="ghost" size="sm" className="ops:text-red-700 ops:hover:bg-red-50" onClick={()=>void send({action:"revoke",user_id:row.user_id,role:row.role,status:"ended",reason:"Revoked from staff manager"})}>Revoke primary role</Button></div></td>}</tr>)}
              {!staff.length&&<tr><td className="ops:px-4 ops:py-12 ops:text-center ops:text-muted-foreground" colSpan={canManage?5:4}>No authorized staff identities were returned.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </>;
}
