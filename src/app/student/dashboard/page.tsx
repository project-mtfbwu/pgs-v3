import type { Metadata } from "next";
import { AskPurpleGuide } from "@/components/ask-purple-guide";
import { DeveloperStudentShell } from "@/components/developer-student-shell";
import { NoStudentContextPage } from "@/components/no-student-context-page";
import { PremiumStudentDashboard } from "@/components/premium-student-dashboard";
import { RecoveredStudentLegacyPage } from "@/components/recovered-student-legacy-page";
import { RetainedStudentFooter } from "@/components/retained-student-footer";
import { studentDashboardHtml } from "@/legacy/generated/student-dashboard";
import { displayName, getOwnAvatarUrl } from "@/lib/student-data";
import { loadPremiumDashboardCatalog, loadPremiumWorkspace, requirePremiumActor } from "@/lib/premium-workspace";
import { resolveStudentExperience } from "@/lib/student-experience";

export const metadata: Metadata = { title: "Student Dashboard" };
export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const state = await resolveStudentExperience();
  if (!state) return <NoStudentContextPage />;

  const avatarUrl = state.kind === "anonymous"
    ? "/assets/img/default-avatar.png"
    : await getOwnAvatarUrl(state.profile.avatar_path);

  if (state.kind !== "authenticated_premium") {
    return <RecoveredStudentLegacyPage html={studentDashboardHtml} page="student-dashboard" state={state} avatarUrl={avatarUrl} />;
  }

  await requirePremiumActor();
  const { user, profile } = state;
  const [workspace, catalog] = await Promise.all([
    loadPremiumWorkspace(user.id),
    loadPremiumDashboardCatalog()
  ]);
  const name = displayName(profile, user);

  return (
    <>
      <DeveloperStudentShell
        name={name}
        email={user.email ?? ""}
        avatarUrl={avatarUrl}
        stateKind={state.kind}
        unreadCount={state.unreadCount}
        notifications={state.notifications}
        active="feed"
        preview={state.preview}
        contentClassName="developer-premium-dashboard"
        urgentAlert={workspace.alerts[0]?.alert_text}
      >
        <AskPurpleGuide />
        <PremiumStudentDashboard
          avatarUrl={avatarUrl}
          catalog={catalog}
          dashboard={workspace.premiumProfile}
          email={user.email ?? ""}
          name={name}
          pathway={profile.study_level}
          readOnly={Boolean(state.preview)}
          workspace={workspace}
        />
      </DeveloperStudentShell>
      <RetainedStudentFooter studentState={state.kind} />
    </>
  );
}
