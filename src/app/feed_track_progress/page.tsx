import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApprovedStudentShell } from "@/components/approved-student-shell";
import { PremiumLockedState } from "@/components/premium-locked-state";
import { PremiumProgressBoard } from "@/components/premium-progress-board";
import { displayName, getOwnAvatarUrl } from "@/lib/student-data";
import { loadPremiumWorkspace, requirePremiumActor } from "@/lib/premium-workspace";
import { resolveStudentExperience } from "@/lib/student-experience";

export const metadata:Metadata={title:"Track Your Progress"};
export const dynamic="force-dynamic";

export default async function ProgressPage(){
  const state=await resolveStudentExperience();
  if(!state)notFound();
  if(state.kind==="anonymous")return <PremiumLockedState feature="progress" name="Aspirant" avatarUrl="/assets/img/default-avatar.png" stateKind="anonymous"/>;
  const {user,profile}=state;const avatarUrl=await getOwnAvatarUrl(profile.avatar_path);
  if(state.kind!=="authenticated_premium")return <PremiumLockedState feature="progress" name={state.name} email={user.email??""} avatarUrl={avatarUrl}/>;
  await requirePremiumActor();const workspace=await loadPremiumWorkspace(user.id);
  return <ApprovedStudentShell name={displayName(profile,user)} email={user.email??""} avatarUrl={avatarUrl} stateKind={state.kind} unreadCount={state.unreadCount} active="progress" contentClassName="approved-workspace-layout"><PremiumProgressBoard workspace={workspace}/></ApprovedStudentShell>;
}
