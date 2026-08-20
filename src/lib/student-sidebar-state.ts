export const studentSidebarStorageKey = "pgs.student-sidebar.desktop";
export const studentSidebarDesktopQuery = "(min-width: 768px)";

export function resolveStudentSidebarOpen(isDesktop: boolean, storedState: string | null): boolean {
  if (!isDesktop) return false;
  return storedState === "open";
}
