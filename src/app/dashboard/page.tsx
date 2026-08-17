import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeveloperStudentIdentityCard, DeveloperStudentShell } from "@/components/developer-student-shell";
import { NoStudentContextPage } from "@/components/no-student-context-page";
import { PremiumComments } from "@/components/premium-comments";
import { RecoveredStudentLegacyPage } from "@/components/recovered-student-legacy-page";
import { studentDashboardHtml } from "@/legacy/generated/student-dashboard";
import { displayName, getOwnAvatarUrl } from "@/lib/student-data";
import { loadPremiumDashboardCatalog, loadPremiumWorkspace, requirePremiumActor } from "@/lib/premium-workspace";
import { resolveStudentExperience } from "@/lib/student-experience";

export const metadata: Metadata = { title: "Purple Premium Dashboard" };
export const dynamic = "force-dynamic";

export default async function PremiumDashboardPage() {
  const state=await resolveStudentExperience();if(!state)return <NoStudentContextPage/>;if(state.kind==="anonymous")redirect("/login?redirect=%2Fdashboard");
  const user=state.user;const profile=state.profile;const avatarUrl=await getOwnAvatarUrl(profile.avatar_path);
  if (state.kind!=="authenticated_premium") return <RecoveredStudentLegacyPage html={studentDashboardHtml} page="dashboard-locked" state={state} avatarUrl={avatarUrl}/>;
  await requirePremiumActor();
  const [workspace,catalog]=await Promise.all([loadPremiumWorkspace(user.id),loadPremiumDashboardCatalog()]);
  const name = displayName(profile, user);
  const dashboard = workspace.premiumProfile;
  const topPicks = [
    ...catalog.events.slice(0,3).map((item)=>({key:`event-${item.id}`,title:item.title,label:item.starts_at?new Date(item.starts_at).toLocaleDateString("en-GB",{day:"numeric",month:"short"}):"Event",href:`/purpleevents/session/${item.id}`,tag:"event"})),
    ...catalog.courses.slice(0,5-Math.min(catalog.events.length,3)).map((item)=>({key:`course-${item.id}`,title:item.title,label:"Course",href:`/programsfull/program/${item.id}?type=course`,tag:"course"}))
  ];
  const shortlisted = workspace.universities.filter((item)=>item.stage!=="finalized"&&item.stage!=="declined");
  const finalized = workspace.universities.filter((item)=>item.stage==="finalized");
  return <DeveloperStudentShell name={name} email={user.email ?? ""} avatarUrl={avatarUrl} stateKind={state.kind} unreadCount={state.unreadCount} notifications={state.notifications} active="premium" preview={state.preview} contentClassName="developer-premium-dashboard">
    <section className="pt-0 mobile-student-cart about-section half-section overlap-height position-relative overflow-hidden pl-100px">
      <DeveloperStudentIdentityCard name={name} email={user.email??""} avatarUrl={avatarUrl} pathway={dashboard?.pathway_label||profile.study_level} premiumActive />
      <div className="container overlap-gap-section p-0">
        <div className="row align-items-end mt-4">
          <div className="w-616px">
            <h1 className="text-start text-black fnt-family fw-500 fs-76 lh-full mb-0 pb-2 mobile-fs-24 mobile-text-center">counsellor <br />page for <br />students</h1>
            <div className="card-overview mt-10" id="quick-dashboard-overview"><h2 className="text-black text-center fs-17 lh-22 fw-600 mb-3">Your Quick Dashboard overview</h2></div>
            <div className="premium-quick-overview">
              <article className="card-fill-box">Uni<br />Applied<strong>{dashboard?.universities_applied??0}</strong></article>
              <article className="card-fill-box">Offers<br />Received<strong>{dashboard?.offers_received??0}</strong></article>
              <article className="card-fill-box">Tuition Receipt<br />Uploaded<strong>{dashboard?.tuition_receipt_uploaded==null?"Not set":dashboard.tuition_receipt_uploaded?"Yes":"No"}</strong></article>
              <article className="card-fill-box">Visa<br />Applied<strong>{dashboard?.visa_status==="applied"?"Yes":"No"}</strong></article>
            </div>
          </div>
          <aside className="w-303px p-0 group-todo-list" aria-label="Top picks">
            <div className="top-todo-list" id="top-picks"><h2 className="mb-0 fs-20 text-black lh-20">Top picks</h2><hr/>
              {topPicks.map((item)=><Link className="todo-list" href={item.href} key={item.key}><span className="content-todo"><strong>{item.title}</strong><span className="todo-tag">{item.label}</span><span className="todo-tag-hightlist">#{item.tag}</span></span></Link>)}
              {!topPicks.length&&<p>No top picks available yet.</p>}
            </div>
          </aside>
        </div>

        <section className="dashboard-notes-actions">
          <article className="notes-box"><h2>Notes</h2><p>This is the phase where we check your documents, get your applications ready, and start planning your university journey. Reach out to your counselor whenever you need feedback.</p></article>
          <article className="dashboard-aspirant-card"><h2>{dashboard?.pathway_label||profile.study_level||"Student"} Aspirant</h2><p>{dashboard?.intake_label||"Your intake plan will appear here."}</p><div><Link className="btn-progress" href="/feed_track_progress">Track Your Progress</Link><Link className="btn-progress" href="/purpleboard">#purpleBoard</Link></div></article>
        </section>

        <section className="content-report canonical-where-you-stand" id="where-you-stand">
          <h2 className="fnt-family">Where You Stand</h2><p>This centralized study dashboard tracks onboarding, key milestones, and next steps.</p>
          <div className="canonical-prep-grid">
            <article><strong>{dashboard?.onboarding_percentage==null?"Not set":`${dashboard.onboarding_percentage}%`}</strong><span>through your onboarding journey</span></article>
            <article><h3>Onboarding Checklist</h3>{dashboard?.onboarding_checklist.length?<ul>{dashboard.onboarding_checklist.map((item,index)=><li key={`${item.text}-${index}`}><span aria-hidden="true">{item.checked?"✓":"○"}</span> {item.text}</li>)}</ul>:<p>No checklist items configured.</p>}</article>
            <article><h3>{dashboard?.feedback_session_title||"Feedback session"}</h3>{dashboard?.feedback_session_items.length?<ul>{dashboard.feedback_session_items.map((item,index)=><li key={`${item.text}-${index}`}><span aria-hidden="true">{item.checked?"✓":"○"}</span> {item.text}</li>)}</ul>:<p>No feedback items configured.</p>}</article>
            <article><h3>Documents Tracker</h3>{dashboard&&Object.keys(dashboard.documents_tracker).length?<dl>{Object.entries(dashboard.documents_tracker).map(([label,item])=><div key={label}><dt>{label}</dt><dd className={item.is_red?"text-red":undefined}>{item.count}</dd></div>)}</dl>:<p>No tracker items configured.</p>}</article>
            <article><h3>Uni Shortlist</h3><strong>{shortlisted.length}</strong>{shortlisted.length?<ul>{shortlisted.map((item)=><li key={item.id}>{item.universities?.name??"University"} · {item.stage.replaceAll("_"," ")}</li>)}</ul>:<p>No universities shortlisted yet.</p>}</article>
          </div>
        </section>

        <section className="premium-finalized-universities" id="finalized-universities"><div><strong>{finalized.length}</strong><h2 className="fnt-family">Finalized Uni List</h2></div>{finalized.length?<ol>{finalized.map((selection)=><li key={selection.id}><Link href="/explorecountries">{selection.universities?.name??"University"}</Link></li>)}</ol>:<p>No universities finalized yet.</p>}</section>

        <section className="dashboard-work-lists">
          <article id="currently-working-on"><h2 className="fnt-family">You are Currently Working On</h2>{dashboard?.currently_working_on.length?<ul>{dashboard.currently_working_on.map((task,index)=><li key={`${task}-${index}`}>{index===0&&<strong>URGENT </strong>}{task}</li>)}</ul>:<p>No tasks currently being worked on.</p>}</article>
          <article id="future-tasks"><h2 className="fnt-family">Future task <span>preview</span></h2>{dashboard?.future_tasks.length?<ul>{dashboard.future_tasks.map((task,index)=><li key={`${task}-${index}`}>{index===1&&<strong>IMP </strong>}{task}</li>)}</ul>:<p>No future tasks scheduled.</p>}</article>
        </section>

        <PremiumComments comments={workspace.comments} studentId={user.id} readOnly={Boolean(state.preview)} />

        <section className="dashboard-upcoming-events"><h2 className="fnt-family">Upcoming Events</h2><div className="dashboard-events-board">{catalog.events.slice(0,3).map((event)=><article className="dashboard-event-card" key={event.id}><time dateTime={event.starts_at??undefined}>{event.starts_at?new Date(event.starts_at).toLocaleString("en-GB"):"Date to be announced"}</time><h3>{event.title}</h3><p>{event.summary}</p><Link href={`/purpleevents/session/${event.id}`}>View event</Link></article>)}{!catalog.events.length&&<p>No upcoming events at the moment.</p>}</div></section>
        <section className="dashboard-lower-callout"><Image src="/assets/img/top.png" alt="" width={180} height={120} unoptimized/><div><h2 className="fnt-family">You&apos;re all set</h2><p>Keep your profile, documents, reviews, and university plan moving through the sections above.</p></div></section>
      </div>
    </section>
  </DeveloperStudentShell>;
}
