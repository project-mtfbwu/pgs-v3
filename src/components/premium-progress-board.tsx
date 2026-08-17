import Image from "next/image";
import Link from "next/link";
import { StudentKanbanBoard } from "@/components/student-kanban-board";
import type { PremiumWorkspace } from "@/lib/premium-workspace";

export function PremiumProgressBoard({workspace}:{workspace:PremiumWorkspace}){
  const completed=workspace.requirements.filter((item)=>item.status==="approved").length;
  const pending=workspace.requirements.filter((item)=>item.status!=="approved").slice(0,3);
  return <div className="developer-progress is-active">
    <section className="pt-6 about-section half-section overlap-height position-relative overflow-hidden mobile-doc-section">
      <div className="container overlap-gap-section p-0">
        <div className="row justify-content-md-center align-items-center">
          <div className="col-lg-7 d-flex gap-10 align-items-center">
            <div className="w-300px"><h1 className="text-start text-black fnt-family fw-400 fs-50 lh-full pt-0 mb-0">your<br/>custom<br/>progress<br/>board</h1></div>
            <div className="yellow-box-style-3 w-300px" id="important-alerts">
              <div className="header-yellow-box-style-3"><Image src="/assets/img/bell.gif" alt="" width={35} height={35} unoptimized/> Important Alerts</div>
              <ol>{workspace.alerts.length?workspace.alerts.map((alert)=><li key={alert.id}>{alert.alert_text}</li>):<li>No alerts right now. Your mentor will post updates here.</li>}</ol>
            </div>
          </div>
        </div>
        <div className="row justify-content-md-center mt-3"><div className="col-lg-6 px-4"><p className="mb-0 text-black fs-16 lh-19">This section is built to guide you from Day 1 to your final university admit. Your mentor&apos;s personalized map keeps draft, in progress, and completed stages in one clear view.</p></div></div>
      </div>
    </section>

    <section className="group-chart-section pt-0 mobile-doc-section">
      <div className="w-780px m-auto">
        <div className="card-box">
          <div className="list-of-graphs">
            <div className="d-flex-group"><p className="mb-0 text-black">#draftMeter</p></div>
            {pending.length?pending.map((item)=><div className="d-flex-group" key={item.id}><div className="graph-box"><Image src="/assets/img/meeter.png" alt="" width={54} height={54} unoptimized/></div><span className="mobile-roted">|</span><div className="graph-box-content">{item.document_type} <small>({item.status.replace("_"," ")})</small></div></div>):<div className="draft-default-note">{workspace.requirements.length?"All configured document types are approved.":"Once your document requirements are configured, pending drafts will appear here."}</div>}
          </div>
          <div className="count-of-grpah"><span>+</span><p className="mb-0 fnt-family fs-100 lh-full">{completed}</p><span>completed</span></div>
        </div>
        <section className="premium-review-notes" id="review-notes">
          <div id="reviewQueue"><h2 className="fnt-family">#reviewQueue</h2>{workspace.reviews.map((item)=><article key={item.id}><label><input type="checkbox" checked={item.status==="completed"} disabled/> <strong>{item.title}</strong></label><span>{item.status.replace("_"," ")}</span><p>{item.details}</p></article>)}{!workspace.reviews.length&&<p>No review items yet.</p>}</div>
          <div><h2 className="fnt-family">#counselorNotes</h2>{workspace.notes.map((note)=><article key={note.id}><p>{note.body}</p><time>{new Date(note.created_at).toLocaleDateString("en-GB")}</time></article>)}{!workspace.notes.length&&<p>No student-visible notes yet.</p>}</div>
        </section>
      </div>
    </section>

    <section className="developer-loopboard-intro">
      <h2 className="fnt-family">#PGS Loopboard</h2>
      <p>At PurpleGuide.study, targeted success starts with a clear, well-thought-out study path. After a detailed chat with your counselor and mentor, we reverse-engineer your journey from your goal and build the right steps for you.</p>
      <p>Your custom roadmap is split into journey map, in progress, draft phase, and completed. It is built for your profile—not as a generic checklist.</p>
    </section>
    <StudentKanbanBoard columns={workspace.columns} tasks={workspace.tasks}/>

    <section className="developer-progress-guidance">
      <Image src="/assets/img/complete-notes.png" alt="" width={116} height={116} unoptimized/>
      <div><h2 className="fnt-family">what you need to do next</h2><p>Your review queue, counselor feedback, document drafts and shared board are one workflow. Complete the next visible step and your mentor will move it forward.</p></div>
    </section>
    <section className="developer-progress-tips">
      <article><Image src="/assets/img/smile.png" alt="" width={74} height={74} unoptimized/><h3 className="fnt-family">A quick tip</h3><p>Keep the files and feedback attached to each step so your mentor can review without delay.</p></article>
      <article><Image src="/assets/img/computer.jpg" alt="" width={310} height={190} unoptimized/><h3 className="fnt-family">Resource Drop</h3><p>Use the secure document workspace for the files your counselor requests.</p><Link href="/upload_your_doc">Open your resources</Link></article>
    </section>
  </div>;
}
