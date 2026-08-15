import type { Metadata } from "next";
import { RecoveredStudentLegacyPage } from "@/components/recovered-student-legacy-page";
import { purplePremiumOverviewHtml } from "@/legacy/generated/purplepremium-overview";
import { getOwnAvatarUrl } from "@/lib/student-data";
import { resolveStudentExperience, type AnonymousStudentExperience } from "@/lib/student-experience";

export const metadata: Metadata = { title: "Purple Premium Overview" };
export const dynamic = "force-dynamic";

const anonymousState: AnonymousStudentExperience = {
  kind: "anonymous",
  user: null,
  profile: null,
  name: null,
  unreadCount: 0,
  premiumStatus: "none"
};

export default async function PurplePremiumOverviewPage() {
  const state = await resolveStudentExperience();
  const studentState = state ?? anonymousState;
  const avatarUrl = studentState.kind === "anonymous"
    ? "/assets/img/default-avatar.png"
    : await getOwnAvatarUrl(studentState.profile.avatar_path);
  return <RecoveredStudentLegacyPage html={purplePremiumOverviewHtml} page="purplepremium-overview" state={studentState} avatarUrl={avatarUrl} />;
}
