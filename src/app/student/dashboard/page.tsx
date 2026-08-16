import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RecoveredStudentLegacyPage } from "@/components/recovered-student-legacy-page";
import { studentDashboardHtml } from "@/legacy/generated/student-dashboard";
import { resolveStudentExperience, studentExperienceAvatarUrl } from "@/lib/student-experience";

export const metadata:Metadata={title:"Student Dashboard"};
export const dynamic="force-dynamic";

export default async function StudentDashboardPage(){
  const state=await resolveStudentExperience();
  if(!state)notFound();
  if(state.kind==="authenticated_premium")redirect("/dashboard");
  const avatarUrl=state.kind==="anonymous"
    ? "/assets/img/default-avatar.png"
    : await studentExperienceAvatarUrl(state);
  return <RecoveredStudentLegacyPage html={studentDashboardHtml} page="student-dashboard" state={state} avatarUrl={avatarUrl}/>;
}
