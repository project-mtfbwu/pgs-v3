import type { Metadata } from "next";
import { RecoveredStudentLegacyPage } from "@/components/recovered-student-legacy-page";
import { applyHomeContent, getPageContent } from "@/lib/content";
import { homeSourceHtml } from "@/lib/home-experience";
import { resolveStudentExperience, studentExperienceAvatarUrl, type AnonymousStudentExperience } from "@/lib/student-experience";

export const metadata: Metadata = { title: "Get your details here" };
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [content, resolution] = await Promise.all([getPageContent("home"), resolveStudentExperience()]);
  const state = resolution ?? ({
    kind: "anonymous",
    user: null,
    profile: null,
    name: null,
    unreadCount: 0,
    premiumStatus: "none"
  } satisfies AnonymousStudentExperience);
  const html = applyHomeContent(homeSourceHtml(state.kind), content);
  const avatarUrl = state.kind === "anonymous" ? undefined : await studentExperienceAvatarUrl(state);
  return <RecoveredStudentLegacyPage page="home" html={html} state={state} avatarUrl={avatarUrl} />;
}
