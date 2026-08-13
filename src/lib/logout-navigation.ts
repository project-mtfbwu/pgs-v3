type LogoutNavigation = Pick<Location, "origin" | "replace">;

function logoutRedirect(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\r\n]/.test(value)) {
    return "/";
  }
  return value;
}

export async function signOutAndNavigate(
  fetcher: typeof fetch = fetch,
  navigation: LogoutNavigation = window.location
): Promise<void> {
  const response = await fetcher("/api/auth/logout", { method: "POST" });
  if (!response.ok) throw new Error("Logout failed");

  const body = await response.json().catch(() => ({})) as { redirect?: unknown };
  const destination = new URL(logoutRedirect(body.redirect), navigation.origin).toString();

  // A document navigation guarantees the public server shell is rendered from
  // the post-sign-out cookie state; replace also prevents returning to a cached
  // authenticated screen with the Back button.
  navigation.replace(destination);
}
