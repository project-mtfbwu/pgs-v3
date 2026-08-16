import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { DeveloperStudentShell } from "@/components/developer-student-shell";
import { DocumentWorkspace } from "@/components/document-workspace";
import { RecoveredStudentLegacyPage } from "@/components/recovered-student-legacy-page";
import { documentsLockedHtml } from "@/legacy/generated/documents-locked";
import { loadPremiumWorkspaceForSubject, requirePremiumActor } from "@/lib/premium-workspace";
import { resolveStudentExperience, studentExperienceAvatarUrl, studentExperienceEmail, studentSubjectId } from "@/lib/student-experience";

export const metadata:Metadata={title:"Upload Your Documents"};
export const dynamic="force-dynamic";

export default async function DocumentsPage(){
  const state=await resolveStudentExperience();
  if(!state)notFound();
  if(state.kind==="anonymous")return <RecoveredStudentLegacyPage html={documentsLockedHtml} page="documents-locked" state={state}/>;
  const avatarUrl=await studentExperienceAvatarUrl(state);
  if(state.kind!=="authenticated_premium")return <RecoveredStudentLegacyPage html={documentsLockedHtml} page="documents-locked" state={state} avatarUrl={avatarUrl}/>;
  if (!state.preview) await requirePremiumActor();
  const workspace=await loadPremiumWorkspaceForSubject(studentSubjectId(state), Boolean(state.preview));
  const name = state.name;
  return <DeveloperStudentShell name={name} email={studentExperienceEmail(state)} avatarUrl={avatarUrl} stateKind={state.kind} unreadCount={state.unreadCount} active="documents" preview={state.preview} contentClassName="developer-documents-page">
    <section className="pt-5 about-section half-section overlap-height position-relative overflow-hidden mobile-doc-section">
      <div className="container overlap-gap-section p-0">
        <div className="row justify-content-md-center align-items-center">
          <div className="col-lg-7 d-flex gap-10 align-items-center">
            <div className="w-300px"><h1 className="text-start text-black fnt-family fw-400 fs-50 lh-full pt-0">upload<br/>your<br/>docs</h1></div>
            <div className="yellow-box-style-3 w-300px">
              <div className="header-yellow-box-style-3"><Image src="/assets/img/bell.gif" alt="" width={35} height={35} unoptimized/> Important Alerts</div>
              <ol>{workspace.alerts.length?workspace.alerts.map((alert)=><li key={alert.id}>{alert.alert_text}</li>):<li>No alerts right now.</li>}</ol>
            </div>
          </div>
        </div>
        <div className="row justify-content-md-center mt-3"><div className="col-lg-6"><p className="mb-0 text-black fs-19 lh-25"><span className="fs-22 d-block mb-1 fw-500">Make sure your file is under 50MB.</span>We accept PDF, JPG, PNG, and MS Word formats. Hit upload when you&apos;re ready.</p></div></div>
        <DocumentWorkspace requirements={workspace.requirements} readOnly={Boolean(state.preview)} />
        <div className="developer-team-goal"><Image src="/assets/img/team-goal.png" alt="" width={980} height={420} unoptimized/></div>
      </div>
    </section>
  </DeveloperStudentShell>;
}
