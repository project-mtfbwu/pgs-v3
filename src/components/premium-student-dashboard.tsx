import Image from "next/image";
import Link from "next/link";
import { PremiumComments } from "@/components/premium-comments";
import type {
  PremiumDashboardCatalog,
  PremiumWorkspace,
  PremiumWorkspaceProfile
} from "@/lib/premium-workspace";

type DashboardEvent = PremiumDashboardCatalog["events"][number];

type CalendarCell = {
  day: number;
  current: boolean;
  event: boolean;
};

type TopPick = {
  href: string;
  imageAlt: string;
  imageUrl: string;
  label: string;
  tag: string;
  title: string;
};

type EventCard = {
  date: string;
  href: string;
  id: number | string;
  mode: string;
  summary: string;
  time: string;
  title: string;
};

const topPickDotClasses = ["yellow-bg", "blue-bg", "red-bg", "purple-bg", "yellow-dark-bg"] as const;
const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

function cleanTag(value: string | undefined, fallback: string): string {
  const tag = value?.trim().replace(/^#/, "");
  return tag || fallback;
}

function eventTimestamp(event: DashboardEvent): number | null {
  if (!event.startsAt) return null;
  const timestamp = new Date(event.startsAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function eventDateLabel(event: DashboardEvent): string {
  const timestamp = eventTimestamp(event);
  return timestamp == null
    ? "EVENT"
    : new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" }).format(timestamp).toUpperCase();
}

function eventTimeLabel(event: DashboardEvent): string {
  const timestamp = eventTimestamp(event);
  return timestamp == null
    ? ""
    : `${new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(timestamp).toUpperCase()} IST`;
}

function buildTopPicks(catalog: PremiumDashboardCatalog): TopPick[] {
  const eventPicks = catalog.events.slice(0, 3).map((event) => ({
    href: `/purpleevents/session/${event.id}`,
    imageAlt: event.imageAlt || event.title,
    imageUrl: event.imageUrl || "/assets/img/computer.jpg",
    label: eventDateLabel(event),
    tag: cleanTag(event.tags?.[0], "event"),
    title: event.title
  }));
  const coursePicks = catalog.courses.slice(0, Math.max(5 - eventPicks.length, 0)).map((course) => ({
    href: `/programsfull/program/${course.id}?type=course`,
    imageAlt: course.imageAlt || course.title,
    imageUrl: course.imageUrl || "/assets/img/saved_1.jpg",
    label: "Course",
    tag: cleanTag(course.tags?.[0], "course"),
    title: course.title
  }));
  const picks = [...eventPicks, ...coursePicks].slice(0, 5);
  if (picks.length) return picks;
  return Array.from({ length: 5 }, (_, index) => ({
    href: "/usmlerotation",
    imageAlt: "Clinical rotation",
    imageUrl: "/assets/img/computer.jpg",
    label: index === 4 ? "FilledUp" : "InProgress",
    tag: ["MEDICAL", "USMLE", "UKintake", "AUSintake", "USMLE"][index],
    title: "Clinical rotation sign up for next batch booking are in progress."
  }));
}

function buildCalendar(events: DashboardEvent[]): { cells: CalendarCell[]; month: string; year: string } {
  const firstEventTimestamp = events.map(eventTimestamp).find((value): value is number => value != null) ?? Date.now();
  const source = new Date(firstEventTimestamp);
  const year = source.getUTCFullYear();
  const month = source.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const previousMonthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingDays = (monthStart.getUTCDay() + 6) % 7;
  const eventDays = new Set(events.flatMap((event) => {
    const timestamp = eventTimestamp(event);
    if (timestamp == null) return [];
    const date = new Date(timestamp);
    return date.getUTCFullYear() === year && date.getUTCMonth() === month ? [date.getUTCDate()] : [];
  }));
  const cells: CalendarCell[] = [];
  for (let offset = leadingDays; offset > 0; offset -= 1) {
    cells.push({ day: previousMonthDays - offset + 1, current: false, event: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, current: true, event: eventDays.has(day) });
  }
  let followingDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 35) {
    cells.push({ day: followingDay, current: false, event: false });
    followingDay += 1;
  }
  return {
    cells,
    month: new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(monthStart).toUpperCase(),
    year: String(year)
  };
}

function Toggle({ checked, label }: { checked: boolean; label: string }) {
  return (
    <label className="toggle-switch" aria-label={label}>
      <input type="checkbox" checked={checked} readOnly disabled />
      <span className="slider" />
    </label>
  );
}

function Checklist({ items, empty }: { items: Array<{ checked: boolean; text: string }>; empty: string }) {
  if (!items.length) return <div className="text-muted">{empty}</div>;
  return items.map((item, index) => (
    <div className="d-flex align-items-center gap-4 mb-4" key={`${item.text}-${index}`}>
      <Toggle checked={item.checked} label={item.text} />
      <span className="w-80 text-start">{item.text}</span>
    </div>
  ));
}

export function PremiumStudentDashboard({
  avatarUrl,
  catalog,
  dashboard,
  email,
  name,
  pathway,
  readOnly,
  workspace
}: {
  avatarUrl: string;
  catalog: PremiumDashboardCatalog;
  dashboard: PremiumWorkspaceProfile | null;
  email: string;
  name: string;
  pathway: string | null;
  readOnly: boolean;
  workspace: PremiumWorkspace;
}) {
  const topPicks = buildTopPicks(catalog);
  const calendar = buildCalendar(catalog.events);
  const pathwayLabel = dashboard?.pathway_label || pathway || "Student";
  const intakeLabel = dashboard?.intake_label || "Your intake plan";
  const isFixture = email.endsWith("@example.test");
  const handle = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) || "student";
  const finalized = workspace.universities
    .filter((selection) => selection.stage === "finalized")
    .map((selection) => ({ id: selection.id, name: selection.universities?.name || "University" }));
  const finalizedCards = finalized.length || !isFixture
    ? finalized
    : Array.from({ length: 6 }, (_, index) => ({ id: `preview-university-${index}`, name: "Univ of Washington" }));
  const shortlisted = workspace.universities.filter((selection) => selection.stage !== "finalized" && selection.stage !== "declined");
  const checklist = dashboard?.onboarding_checklist?.length || !isFixture
    ? dashboard?.onboarding_checklist ?? []
    : [
        { text: "Profile Setup Complete", checked: true },
        { text: "University Shortlist Discussed", checked: false },
        { text: "SOP Discussion Done", checked: false },
        { text: "IELTS/GRE Status Confirmed", checked: false },
        { text: "Resume Uploaded", checked: false },
        { text: "LOR Briefed", checked: false },
        { text: "Loan & Finance Discussed", checked: false }
      ];
  const feedbackItems = dashboard?.feedback_session_items?.length || !isFixture
    ? dashboard?.feedback_session_items ?? []
    : [{ text: "One-on-One Session Booked", checked: false }];
  const documentTracker = dashboard && Object.keys(dashboard.documents_tracker).length
    ? Object.entries(dashboard.documents_tracker)
    : isFixture
      ? Object.entries({
          "SOP Drafts Uploaded": { count: 10 },
          "LORs Uploaded": { count: 3 },
          "Degree Certificate Uploaded": { count: 3 },
          "Graduation Transcript": { count: 3 },
          "Passport Front/Back": { count: 3 },
          "Loan Documents If Applied": { count: 3 },
          "Other Documents": { count: 3 },
          "Pending Documents*": { count: 3, is_red: true }
        })
      : [];
  const comments = workspace.comments.length || !isFixture
    ? workspace.comments
    : [
        { id: "preview-comment-1", parent_id: null, author_id: workspace.studentId, body: "Hey I am facing difficulty with my SOP can you help me out?", created_at: "2025-05-21T10:00:00.000Z" },
        { id: "preview-comment-2", parent_id: null, author_id: "pgs-team", body: "We are going with your university application. If you have any doubts do let us know. Also on other notes can you update us on your SOP status. Have you made drafts?", created_at: "2025-05-21T10:05:00.000Z" },
        { id: "preview-comment-3", parent_id: null, author_id: "pgs-team", body: "Nice to connect. The feedback session helped us understand your concerns and the path you are aiming for.", created_at: "2025-05-21T10:10:00.000Z" }
      ];
  const eventCards: EventCard[] = catalog.events.slice(0, 3).map((event) => ({
    date: eventDateLabel(event),
    href: `/purpleevents/session/${event.id}`,
    id: event.id,
    mode: event.mode || event.locationNote || "Google Meet",
    summary: event.summary || "Meet our Visa Counselor (5+ years experience)",
    time: eventTimeLabel(event),
    title: event.title
  }));
  if (!eventCards.length && isFixture) {
    eventCards.push(
      { date: "SEP 7", href: "/purpleevents", id: "preview-event-1", mode: "Google Meet", summary: "Meet our Visa Counselor (5+ years experience)", time: "7 PM IST", title: "Visa 101 Webinar" },
      { date: "AUG 29", href: "/purpleevents", id: "preview-event-2", mode: "Google Meet", summary: "Meet our Visa Counselor (5+ years experience)", time: "7 PM IST", title: "Visa 101 Webinar" },
      { date: "APRIL 23", href: "/purpleevents", id: "preview-event-3", mode: "Google Meet", summary: "Meet our Visa Counselor (5+ years experience)", time: "7:30 PM IST", title: "Spotlight UCL" }
    );
  }

  return (
    <>
      <section className="premium-dashboard-stage" data-figma-node="17041:10191">
        <div className="premium-profile-card">
          <div className="premium-profile-copy">
            <div className="premium-profile-identity">
              <Image src={avatarUrl} alt="" width={68} height={83} unoptimized />
              <div><h1>{name}</h1><span>@{handle}</span><span>{email}</span></div>
            </div>
            <div className="premium-profile-title"><strong>#PURPLEPREMIUM</strong><span>{pathwayLabel} PATHWAY</span></div>
          </div>
          <div className="premium-profile-badge">#PURPLEPREMIUM</div>
        </div>

        <section className="premium-quick-dashboard" id="quick-dashboard-overview">
          <h2>Your Quick Dashboard overview</h2>
          <div className="premium-metric-grid">
            <article><span>Uni<br />Applied</span><div><i /> <strong>{String(dashboard?.universities_applied ?? 0).padStart(2, "0")}</strong></div></article>
            <article><span>Offers<br />Received</span><div><i /> <strong>{String(dashboard?.offers_received ?? 0).padStart(2, "0")}</strong></div></article>
            <article><span>Tuition Receipt<br />Uploaded</span><div><i /> <Toggle checked={dashboard?.tuition_receipt_uploaded === true} label="Tuition receipt uploaded" /></div></article>
            <article><span>Visa<br />Applied</span><div><i /> <Toggle checked={dashboard?.visa_status === "applied"} label="Visa applied" /></div></article>
          </div>
        </section>

        <aside className="premium-top-picks" id="top-picks">
          <header><h2>Top picks &nbsp;&gt;</h2><Image src="/assets/img/filter-icon.png" alt="" width={20} height={20} unoptimized /></header>
          <div>{topPicks.map((pick, index) => (
            <Link href={pick.href} className="premium-top-pick" key={`${pick.href}-${index}`}>
              <span><strong>{pick.title}</strong><small className="premium-pick-status">{pick.label}</small><small><i className={`${topPickDotClasses[index % topPickDotClasses.length]} dot-tag`} />#{pick.tag}</small></span>
              <Image src={pick.imageUrl} alt={pick.imageAlt} width={91} height={55} unoptimized />
            </Link>
          ))}</div>
        </aside>

        <section className="premium-notes-actions">
          <article className="premium-note-card"><h2>Notes</h2><p>This is the phase where we check your documents, get your applications ready, and start planning your university journey. Got questions or need feedback? Reach out to your counselor anytime—and make sure to join any upcoming sessions we invite you to.</p></article>
          <div className="premium-action-card">
            <strong>{pathwayLabel} Aspirant @{intakeLabel}</strong>
            <div className="premium-action-row"><Link href="/feed_track_progress">Track Your Progress</Link><span>See what’s done, what’s in progress, and what’s coming next.</span></div>
            <div className="premium-action-row board"><Link href="/purpleboard">#purpleBoard</Link><span>Get the latest on scholarships, newly opened courses, and important updates, all in one place.</span></div>
          </div>
        </section>
      </section>

      <div className="premium-dashboard-body">
        <section className="premium-stand-section" id="where-you-stand">
          <header><h2>Where You Stand</h2><p>This is the heart of your study path. This centralized study dashboard helps you track onboarding, monitor progress, see key milestones, and identify next steps. Designed to keep you on track.</p></header>
          <div className="premium-stand-card">
            <div className="premium-onboarding-summary"><strong>{dashboard?.onboarding_percentage ?? 14}%</strong><span>Through Your<br />Onboarding<br />Journey</span></div>
            <section className="premium-check-card"><h3>Onboarding Checklist</h3><Checklist items={checklist} empty="No checklist items configured" /></section>
            <section className="premium-check-card premium-feedback-card"><h3>{dashboard?.feedback_session_title || "June feedback session"}</h3><Checklist items={feedbackItems} empty="No feedback items configured" /></section>
            <h3 className="premium-prep-title">Prep<br />Status</h3>
            <section className="premium-check-card premium-document-tracker"><h3>Documents Tracker</h3>{documentTracker.length ? documentTracker.map(([documentName, data]) => <div className="premium-count-row" key={documentName}><strong className={data.is_red ? "is-red" : ""}>{String(data.count).padStart(2, "0")}</strong><span>{documentName}</span></div>) : <p className="text-muted">No documents configured</p>}</section>
            <section className="premium-check-card premium-shortlist-card"><h3>Uni Shortlist</h3>{shortlisted.length ? shortlisted.map((selection, index) => <div className="premium-count-row" key={selection.id}><strong>{String(index + 1).padStart(2, "0")}</strong><span>{selection.universities?.name || "University"}</span></div>) : <p className="text-muted">No shortlist items configured</p>}</section>
          </div>

          <section className="premium-finalized-board" id="finalized-universities">
            <header><strong>{String(finalizedCards.length).padStart(2, "0")}</strong><h3>Finalized<br />Uni List</h3></header>
            <div className="premium-university-grid">{finalizedCards.map((selection) => <article key={selection.id}><div><span>⊕</span>{selection.name}</div><figure><Image src="/assets/img/uni.jpg" alt={selection.name} width={186} height={186} unoptimized /><figcaption>#USA</figcaption></figure></article>)}{!finalizedCards.length ? <p>No universities finalized yet</p> : null}</div>
          </section>

          <section className="premium-task-board">
            <div id="currently-working-on"><h3>You Are<br />Currently<br />Working On</h3><div>{dashboard?.currently_working_on.length ? dashboard.currently_working_on.map((task, index) => <p key={`${task}-${index}`}>{index === 0 ? <b>URGENT</b> : null}{task}</p>) : <p>No tasks currently being worked on</p>}</div></div>
            <div id="future-tasks"><h3>Future Task<br /><span>Preview</span></h3><div>{dashboard?.future_tasks.length ? dashboard.future_tasks.map((task, index) => <p key={`${task}-${index}`}>{index === 1 ? <b>IMP</b> : null}{task}</p>) : <p>No future tasks scheduled</p>}</div></div>
          </section>
        </section>

        <section className="premium-comment-intro"><p><b>*</b> Got a quick doubt? Drop it in the comments.<br />For detailed queries or feedback, reach out via email,<br />direct call, group meet, or join our feedback sessions.</p><div><span>Status</span><strong>Ready for Your<br />Input</strong></div></section>
        <PremiumComments comments={comments} studentId={workspace.studentId} name={name} avatarUrl={avatarUrl} readOnly={readOnly} />

        <section className="premium-events-section">
          <h2>Upcoming Events</h2>
          <div className="premium-events-grid">
            <div className="dashboard-calendar-card"><div className="dashboard-calendar-header"><span className="dashboard-calendar-arrow">‹</span><div className="dashboard-calendar-month"><span>{calendar.month}</span><span>{calendar.year}</span></div><span className="dashboard-calendar-arrow next">›</span></div><div className="dashboard-calendar-week">{weekDays.map((day) => <span key={day}>{day}</span>)}</div><div className="dashboard-calendar-days">{calendar.cells.map((cell, index) => <span className={`dashboard-calendar-day${cell.current ? "" : " is-muted"}${cell.event ? " has-event" : ""}`} key={`${cell.day}-${index}`}>{cell.day}</span>)}</div></div>
            <div className="grid-box-style-2 dashboard-events-board">{eventCards.map((event) => <Link href={event.href} className="card-box-1 dashboard-event-card" key={event.id}><div className="dashboard-event-row"><h3 className="dashboard-event-chip title">{event.title}</h3><h3 className="dashboard-event-chip">{event.date}</h3>{event.time ? <h3 className="dashboard-event-chip">{event.time}</h3> : null}</div><p>{event.summary}</p><p><b>Mode:&nbsp;</b>{event.mode}</p></Link>)}<div className="dashboard-event-more"><strong>+{Math.max(catalog.events.length, 4)}</strong><span>more</span></div></div>
          </div>
        </section>
      </div>
    </>
  );
}
