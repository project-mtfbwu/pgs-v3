export type AccountShellState = { name: string; unreadCount: number };

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export function applyAuthenticatedShell(html: string, state: AccountShellState): string {
  const name = escapeHtml(state.name);
  const account = `<a href="/student/dashboard" class="btn btn-login pgs-auth-account">${name}</a>`;
  return html
    .replaceAll('<a href="/Login" class="btn btn-login">Login</a>', account)
    .replaceAll('<a href="/login" class="btn btn-login">Login</a>', account)
    .replace(/Welcome\s*<br>\s*User/g, `Welcome <br>${name}`)
    .replaceAll("No notifications yet.", state.unreadCount ? `${state.unreadCount} unread notification${state.unreadCount === 1 ? "" : "s"}. <a href="/notifications">View notifications</a>` : "No notifications yet.");
}
