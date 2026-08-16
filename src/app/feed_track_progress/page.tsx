import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeveloperStudentShell } from "@/components/developer-student-shell";
import { PremiumProgressBoard } from "@/components/premium-progress-board";
import { RecoveredStudentLegacyPage } from "@/components/recovered-student-legacy-page";
import { progressLockedHtml } from "@/legacy/generated/progress-locked";
import { loadPremiumWorkspaceForSubject, requirePremiumActor } from "@/lib/premium-workspace";
import { resolveStudentExperience, studentExperienceAvatarUrl, studentExperienceEmail, studentSubjectId } from "@/lib/student-experience";

export const metadata:Metadata={title:"Track Your Progress"};
export const dynamic="force-dynamic";

export default async function ProgressPage(){
  const state=await resolveStudentExperience();
  if(!state)notFound();
  if(state.kind==="anonymous")return <RecoveredStudentLegacyPage html={progressLockedHtml} page="progress-locked" state={state}/>;
  const avatarUrl=await studentExperienceAvatarUrl(state);
  if(state.kind!=="authenticated_premium")return <RecoveredStudentLegacyPage html={progressLockedHtml} page="progress-locked" state={state} avatarUrl={avatarUrl}/>;
  if (!state.preview) await requirePremiumActor();
  const workspace=await loadPremiumWorkspaceForSubject(studentSubjectId(state), Boolean(state.preview));
  const name = state.name;
  return <DeveloperStudentShell name={name} email={studentExperienceEmail(state)} avatarUrl={avatarUrl} stateKind={state.kind} unreadCount={state.unreadCount} active="progress" preview={state.preview} contentClassName="developer-progress-page"><PremiumProgressBoard workspace={workspace}/></DeveloperStudentShell>;
}
