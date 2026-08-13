export type AccountShellState = { name: string; unreadCount: number; premium?: boolean };

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export function applyAuthenticatedShell(html: string, state: AccountShellState): string {
  const name = escapeHtml(state.name);
  const account = `<a href="/student/dashboard" class="btn btn-login pgs-auth-account" data-student-state="${state.premium ? "authenticated_premium" : "authenticated_standard"}">${name}</a>`;
  return html
    .replace(/<a\s+href=["']\/login["']\s+class=["']btn btn-login["']>\s*Login\s*<\/a>/gi, account)
    .replace(/Welcome\s*<br\s*\/?>\s*User/g, `Welcome <br>${name}`)
    .replace(/<a\s+href=["']#["']([^>]*)>(\s*<img[^>]+profile-icon[\s\S]*?Profile\s*)<\/a>/gi, `<a href="/student/profile"$1>$2</a>`)
    .replace(/<a\s+href=["']#["']([^>]*)>(\s*<img[^>]+heart-icon[\s\S]*?Saved List\s*)<\/a>/gi, `<a href="/saved"$1>$2</a>`)
    .replace(/<a\s+href=["']\/login["']([^>]*)>([\s\S]*?<img[^>]+logout[^>]*>[\s\S]*?)Login\s*<\/a>/gi, `<a href="/logout"$1>$2Logout</a>`)
    .replaceAll("No notifications yet.", state.unreadCount ? `${state.unreadCount} unread notification${state.unreadCount === 1 ? "" : "s"}. <a href="/notifications">View notifications</a>` : "No notifications yet.");
}
