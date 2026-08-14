import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ApprovedStudentShell, StudentIdentityCard } from "@/components/approved-student-shell";
import { StandardStudentDashboard } from "@/components/standard-student-dashboard";
import { displayName, getOwnAvatarUrl } from "@/lib/student-data";
import { resolveStudentExperience } from "@/lib/student-experience";

export const metadata:Metadata={title:"Student Dashboard"};
export const dynamic="force-dynamic";

export default async function StudentDashboardPage(){
  const state=await resolveStudentExperience();
  if(!state)notFound();
  if(state.kind==="anonymous")redirect("/login?redirect=%2Fstudent%2Fdashboard");
  if(state.kind==="authenticated_premium")redirect("/dashboard");
  const {user,profile}=state;const avatarUrl=await getOwnAvatarUrl(profile.avatar_path);const name=displayName(profile,user);
  return <ApprovedStudentShell name={name} email={user.email??""} avatarUrl={avatarUrl} stateKind={state.kind} unreadCount={state.unreadCount} active="feed" contentClassName="approved-dashboard-feed"><StudentIdentityCard name={name} email={user.email??""} avatarUrl={avatarUrl} pathway={profile.study_level} premiumActive={false}/><StandardStudentDashboard/></ApprovedStudentShell>;
}
