import { AdminPageHeader } from "@/components/admin-page-header";
import { StaffAccessControls } from "@/components/staff-access-controls";
import { requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccessPage(){
  await requireStaffPermission("premium.manage");
  const supabase=await createSupabaseServerClient();
  const [{data:profiles},{data:mentors},{data:plans},{data:events},{data:assignments}]=await Promise.all([
    supabase.from("profiles").select("id,full_name").order("full_name"),
    supabase.from("staff_profiles").select("user_id,display_name").eq("role","mentor").eq("status","active").order("display_name"),
    supabase.from("premium_plans").select("code,label,duration_months").eq("is_active",true).order("sort_order"),
    supabase.from("premium_entitlement_events").select("id,student_id,resulting_status,source,actor_id,reason,occurred_at,plan_code,duration_months,starts_at,ends_at").order("occurred_at",{ascending:false}).limit(100),
    supabase.from("mentor_assignments").select("id,student_id,mentor_id,status,assigned_at,ended_at,reason").order("assigned_at",{ascending:false}).limit(100)
  ]);
  return <main className="ops-page"><AdminPageHeader eyebrow="Students / Access" title="Premium plans and mentor assignments" description="Premium is a time-bounded entitlement. A new grant starts immediately at its authoritative server approval time; every action and expiry is audited."/><StaffAccessControls students={(profiles??[]).map((profile)=>({id:profile.id,label:`${profile.full_name||"Student"} — ${profile.id}`}))} mentors={(mentors??[]).map((mentor)=>({id:mentor.user_id,label:`${mentor.display_name||"Mentor"} — ${mentor.user_id}`}))} plans={(plans??[]).map((plan)=>({code:plan.code,label:plan.label,durationMonths:plan.duration_months}))}/><section className="ops-dashboard-grid"><div className="ops-card"><h2>Premium entitlement history</h2><div className="ops-history-list">{(events??[]).map((event)=><article key={event.id}><span className={`ops-badge is-${event.resulting_status}`}>{event.resulting_status}</span><strong>{event.source.replaceAll("_"," ")} · {event.plan_code?.replaceAll("_"," ")??"legacy period"}</strong><code>{event.student_id}</code>{event.starts_at&&event.ends_at&&<small>{new Date(event.starts_at).toLocaleString("en-GB")} → {new Date(event.ends_at).toLocaleString("en-GB")} · {event.duration_months} calendar month{event.duration_months===1?"":"s"}</small>}<small>{new Date(event.occurred_at).toLocaleString("en-GB")} · {event.reason||"No reason supplied"}</small></article>)}</div></div><div className="ops-card"><h2>Mentor assignment history</h2><div className="ops-history-list">{(assignments??[]).map((assignment)=><article key={assignment.id}><span className={`ops-badge is-${assignment.status}`}>{assignment.status}</span><strong>Mentor <code>{assignment.mentor_id}</code></strong><code>{assignment.student_id}</code><small>{new Date(assignment.assigned_at).toLocaleString("en-GB")} · {assignment.reason||"No reason supplied"}</small></article>)}</div></div></section></main>;
}
