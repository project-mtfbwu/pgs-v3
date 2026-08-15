import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeveloperStudentShell } from "@/components/developer-student-shell";
import { PremiumProgressBoard } from "@/components/premium-progress-board";
import { RecoveredStudentLegacyPage } from "@/components/recovered-student-legacy-page";
import { progressLockedHtml } from "@/legacy/generated/progress-locked";
import { displayName, getOwnAvatarUrl } from "@/lib/student-data";
import { loadPremiumWorkspace, requirePremiumActor } from "@/lib/premium-workspace";
import { resolveStudentExperience } from "@/lib/student-experience";

export const metadata:Metadata={title:"Track Your Progress"};
export const dynamic="force-dynamic";

export default async function ProgressPage(){
  const state=await resolveStudentExperience();
  if(!state)notFound();
  if(state.kind==="anonymous")return <RecoveredStudentLegacyPage html={progressLockedHtml} page="progress-locked" state={state}/>;
  const {user,profile}=state;const avatarUrl=await getOwnAvatarUrl(profile.avatar_path);
  if(state.kind!=="authenticated_premium")return <RecoveredStudentLegacyPage html={progressLockedHtml} page="progress-locked" state={state} avatarUrl={avatarUrl}/>;
  await requirePremiumActor();const workspace=await loadPremiumWorkspace(user.id);
  return <DeveloperStudentShell name={displayName(profile,user)} email={user.email??""} avatarUrl={avatarUrl} stateKind={state.kind} unreadCount={state.unreadCount} active="progress" contentClassName="developer-progress-page"><PremiumProgressBoard workspace={workspace}/></DeveloperStudentShell>;
}
