export type StudentShellState = "anonymous" | "authenticated_standard" | "authenticated_premium";

export type StudentShellNavKey = "feed" | "premium" | "purpleboard" | "cv" | "rotation" | "countries" | "profile" | "saved" | "progress" | "documents" | "resources";

export const studentSidebarLinks: ReadonlyArray<{ href: string; label: string; key: StudentShellNavKey }> = [
  { href: "/studentresources", label: "#datesDeadlines", key: "resources" },
  { href: "/feed_track_progress", label: "Track Your Progress", key: "progress" },
  { href: "/purpleboard", label: "#purpleBoard", key: "purpleboard" },
  { href: "/upload_your_doc", label: "Upload Your Docs", key: "documents" },
  { href: "/finance", label: "#purpleFinance Hub", key: "feed" },
  { href: "/scholarship", label: "#purpleScholarship", key: "feed" },
  { href: "/cvreadyprogram", label: "CV-Ready Programs", key: "cv" }
] as const;

export const premiumLockedLabel = "Yet to Unlock Full Access";

export function premiumShellDestination(state: StudentShellState): string {
  return state === "authenticated_premium" ? "/student/dashboard" : "/purplepremiumhome";
}
