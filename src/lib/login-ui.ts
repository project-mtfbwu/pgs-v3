const OAUTH_UNAVAILABLE_NOTICE = `
<div class="pgs-auth-notice" role="status">
  Google sign-in is not available yet. Please use your email and password.
</div>
`;

export function withLoginError(html: string, error: string | undefined): string {
  if (error !== "oauth_unavailable") return html;
  return html.replace(/(<form\b)/i, `${OAUTH_UNAVAILABLE_NOTICE}$1`);
}
