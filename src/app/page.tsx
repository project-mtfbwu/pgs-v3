import { cmsMetadata } from "@/lib/cms-metadata";
import { RecoveredStudentLegacyPage } from "@/components/recovered-student-legacy-page";
import { applyHomeContent, getPageContent } from "@/lib/content";
import { homeSourceHtml } from "@/lib/home-experience";
import { getOwnAvatarUrl } from "@/lib/student-data";
import { resolveStudentExperience, type AnonymousStudentExperience } from "@/lib/student-experience";

export async function generateMetadata() { return cmsMetadata("home"); }
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [content, resolution] = await Promise.all([getPageContent("home"), resolveStudentExperience()]);
  const state = resolution ?? ({
    kind: "anonymous",
    user: null,
    profile: null,
    name: null,
    unreadCount: 0,
    notifications: [],
    premiumStatus: "none"
  } satisfies AnonymousStudentExperience);
  const html = applyHomeContent(homeSourceHtml(state.kind), content);
  const avatarUrl = state.kind === "anonymous" ? undefined : await getOwnAvatarUrl(state.profile.avatar_path);
  return <RecoveredStudentLegacyPage page="home" html={html} state={state} avatarUrl={avatarUrl} />;
}
