const OAUTH_UNAVAILABLE_NOTICE = `
<div class="pgs-auth-notice" role="status">
  Google sign-in is not available yet. Please use your email and password.
</div>
`;

const STUDENT_OAUTH_UNAVAILABLE_NOTICE = `
<div class="pgs-auth-notice" role="status">
  This Google sign-in could not open a student account. Please use your usual sign-in method or contact support.
</div>
`;

export function withLoginError(html: string, error: string | undefined): string {
  const notice = error === "oauth_unavailable"
    ? OAUTH_UNAVAILABLE_NOTICE
    : error === "student_oauth_unavailable"
      ? STUDENT_OAUTH_UNAVAILABLE_NOTICE
      : null;
  return notice ? html.replace(/(<form\b)/i, `${notice}$1`) : html;
}
