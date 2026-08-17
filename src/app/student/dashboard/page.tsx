import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NoStudentContextPage } from "@/components/no-student-context-page";
import { RecoveredStudentLegacyPage } from "@/components/recovered-student-legacy-page";
import { studentDashboardHtml } from "@/legacy/generated/student-dashboard";
import { getOwnAvatarUrl } from "@/lib/student-data";
import { resolveStudentExperience } from "@/lib/student-experience";

export const metadata:Metadata={title:"Student Dashboard"};
export const dynamic="force-dynamic";

export default async function StudentDashboardPage(){
  const state=await resolveStudentExperience();
  if(!state)return <NoStudentContextPage/>;
  if(state.kind==="authenticated_premium")redirect("/dashboard");
  const avatarUrl=state.kind==="anonymous"
    ? "/assets/img/default-avatar.png"
    : await getOwnAvatarUrl(state.profile.avatar_path);
  return <RecoveredStudentLegacyPage html={studentDashboardHtml} page="student-dashboard" state={state} avatarUrl={avatarUrl}/>;
}
