import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { can,requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Student={id:string;full_name:string;email:string;profile_status:string;study_level:string|null;premium:string;mentor:string};
type DirectoryProfile={id:string;full_name:string;study_level:string|null;profile_completed_at?:string|null};
export default async function StudentsPage({searchParams}:{searchParams:Promise<{q?:string;premium?:string}>}){const context=await requireStaffPermission("overview.read");const filters=await searchParams;const supabase=await createSupabaseServerClient();let students:Student[]=[];
  const canReadAll=can(context,"student_workspace.read_all");
  const isMentorScoped=context.roles.includes("mentor")&&!canReadAll;
  if(can(context,"students.read")){const {data:profiles}=canReadAll
      ? await supabase.from("profiles").select("id,full_name,study_level,profile_completed_at").order("created_at",{ascending:false}).limit(150).ilike("full_name",filters.q?`%${filters.q.replace(/[%_,()]/g," ").slice(0,80)}%`:"%")
      : await supabase.rpc("staff_student_directory",{search_text:filters.q??null,result_limit:150});const directory=(profiles??[]) as DirectoryProfile[];const ids=directory.map((profile)=>profile.id);const [{data:entitlements},{data:assignments}]=canReadAll&&ids.length?await Promise.all([supabase.from("premium_entitlements").select("student_id,status").in("student_id",ids),supabase.from("mentor_assignments").select("student_id,staff_profiles!mentor_assignments_mentor_id_fkey(display_name)").in("student_id",ids).eq("status","active")]):[{data:[]},{data:[]}];const premium=new Map((entitlements??[]).map((row)=>[row.student_id,row.status]));const mentors=new Map((assignments??[]).map((row)=>{const relation=row.staff_profiles as unknown as {display_name:string}|Array<{display_name:string}>|null;return [row.student_id,Array.isArray(relation)?relation[0]?.display_name??"Assigned":relation?.display_name??"Assigned"]}));students=directory.map((profile)=>({id:profile.id,full_name:profile.full_name,email:"",profile_status:canReadAll?(profile.profile_completed_at?"complete":"incomplete"):"directory",study_level:profile.study_level,premium:canReadAll?(premium.get(profile.id)??"none"):"—",mentor:canReadAll?(mentors.get(profile.id)??"Unassigned"):"—"}));
  }else{const {data:assignments}=await supabase.from("mentor_assignments").select("student_id,profiles!mentor_assignments_student_id_fkey(id,full_name,profile_completed_at,study_level)").eq("mentor_id",context.user.id).eq("status","active");students=(assignments??[]).flatMap((assignment)=>{const relation=assignment.profiles as unknown as {id:string;full_name:string;profile_completed_at:string|null;study_level:string|null}|Array<{id:string;full_name:string;profile_completed_at:string|null;study_level:string|null}>|null;const profile=Array.isArray(relation)?relation[0]:relation;return profile?[{id:profile.id,full_name:profile.full_name,email:"",profile_status:profile.profile_completed_at?"complete":"incomplete",study_level:profile.study_level,premium:"active",mentor:context.displayName}]:[]});}
  if(filters.premium)students=students.filter((student)=>student.premium===filters.premium);
  return <div className="ops:flex ops:flex-col ops:gap-6">
    <header className="ops:flex ops:flex-col ops:gap-3 ops:lg:flex-row ops:lg:items-end ops:lg:justify-between">
      <div>
        <p className="ops:m-0 ops:text-xs ops:font-semibold ops:uppercase ops:tracking-[0.14em] ops:text-accent-foreground">Students</p>
        <h2 className="ops:m-0 ops:mt-2 ops:text-2xl ops:font-semibold ops:tracking-tight ops:sm:text-3xl">{isMentorScoped?"My Students":"Student Registry"}</h2>
        <p className="ops:m-0 ops:mt-2 ops:max-w-2xl ops:text-sm ops:leading-6 ops:text-muted-foreground">
          {isMentorScoped?"Only students currently assigned to you are shown. Organization-wide metrics and student records remain out of scope.":"Search the authorized student registry and open only the workspaces permitted by your current scope."}
        </p>
      </div>
      {can(context,"premium.manage")&&<Link className="ops:rounded-md ops:bg-primary ops:px-4 ops:py-2.5 ops:text-sm ops:font-medium ops:text-primary-foreground ops:no-underline ops:hover:bg-primary/90" href="/admin/access">Premium & mentor controls</Link>}
    </header>

    <Card>
      <CardContent className="ops:p-0">
        <form method="get" role="search" className="ops:grid ops:gap-3 ops:border-b ops:border-border ops:p-4 ops:md:grid-cols-[minmax(220px,1fr)_220px_auto]">
          <label className="ops:relative">
            <span className="ops:sr-only">Search student name</span>
            <Search aria-hidden="true" className="ops:absolute ops:left-3 ops:top-1/2 ops:size-4 ops:-translate-y-1/2 ops:text-muted-foreground"/>
            <Input className="ops:pl-9" name="q" type="search" defaultValue={filters.q} placeholder="Search student name…"/>
          </label>
          <label>
            <span className="ops:sr-only">Filter by Premium state</span>
            <select className="ops:h-10 ops:w-full ops:rounded-md ops:border ops:border-input ops:bg-card ops:px-3 ops:text-sm ops:outline-none ops:focus-visible:ring-2 ops:focus-visible:ring-ring" name="premium" defaultValue={filters.premium??""}>
              <option value="">All Premium states</option><option value="active">Active Premium</option><option value="revoked">Revoked</option><option value="none">No entitlement</option>
            </select>
          </label>
          <Button type="submit">Apply filters</Button>
        </form>
        <div className="ops:overflow-x-auto">
          <table className="ops:w-full ops:min-w-[820px] ops:border-collapse ops:text-left ops:text-sm">
            <thead className="ops:bg-muted/60 ops:text-xs ops:uppercase ops:tracking-wide ops:text-muted-foreground"><tr><th className="ops:px-4 ops:py-3 ops:font-semibold">Student</th><th className="ops:px-4 ops:py-3 ops:font-semibold">Profile</th><th className="ops:px-4 ops:py-3 ops:font-semibold">Study level</th><th className="ops:px-4 ops:py-3 ops:font-semibold">Premium</th><th className="ops:px-4 ops:py-3 ops:font-semibold">Mentor</th><th className="ops:px-4 ops:py-3 ops:font-semibold">Workspace</th></tr></thead>
            <tbody>
              {students.map((student)=><tr className="ops:border-t ops:border-border" key={student.id}><td className="ops:px-4 ops:py-3"><strong>{student.full_name||"Student"}</strong></td><td className="ops:px-4 ops:py-3"><span className="ops:rounded-full ops:bg-secondary ops:px-2.5 ops:py-1 ops:text-xs ops:font-medium">{student.profile_status}</span></td><td className="ops:px-4 ops:py-3">{student.study_level||"—"}</td><td className="ops:px-4 ops:py-3"><span className="ops:rounded-full ops:bg-accent ops:px-2.5 ops:py-1 ops:text-xs ops:font-medium ops:text-accent-foreground">{student.premium}</span></td><td className="ops:px-4 ops:py-3">{student.mentor}</td><td className="ops:px-4 ops:py-3">{(student.premium==="active"&&(canReadAll||can(context,"student_workspace.read")))?<Link className="ops:font-medium ops:text-accent-foreground" href={`/admin/students/${student.id}`}>Open workspace →</Link>:<span className="ops:text-muted-foreground">Read-only profile</span>}</td></tr>)}
              {!students.length&&<tr><td className="ops:px-4 ops:py-12 ops:text-center ops:text-muted-foreground" colSpan={6}>No students match this authorized view.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>}
