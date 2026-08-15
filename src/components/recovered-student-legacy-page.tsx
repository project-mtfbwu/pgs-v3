import { LegacyPage } from "@/components/legacy-page";
import { applyAuthenticatedShell } from "@/lib/account-shell";
import { applyPremiumBusinessRule } from "@/lib/premium-business-rule";
import type { StudentExperience } from "@/lib/student-experience";

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character] ?? character);
}

export function keepPurpleBoardPublic(html: string): string {
  return html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (anchor, attributes: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    if (text !== "#purpleboard") return anchor;
    const nextAttributes = /\shref=/i.test(attributes)
      ? attributes.replace(/(\shref\s*=\s*)(["'])[^"']*\2/i, '$1"/purpleboard"')
      : `${attributes} href="/purpleboard"`;
    return `<a${nextAttributes}>${inner}</a>`;
  });
}

export function normalizeLegacyAssetPaths(html: string): string {
  const relativeRoot = String.raw`(?:(?:\.\.\/)+|\.\/)?`;
  return html
    .replace(new RegExp(String.raw`\b(src|poster|href)=(["'])${relativeRoot}assets\/`, "gi"), "$1=$2/assets/")
    .replace(new RegExp(String.raw`\b(src|poster|href)=(["'])${relativeRoot}pgs_admin\/`, "gi"), "$1=$2/pgs_admin/")
    .replace(new RegExp(String.raw`url\((["']?)${relativeRoot}assets\/`, "gi"), "url($1/assets/")
    .replace(new RegExp(String.raw`url\((["']?)${relativeRoot}pgs_admin\/`, "gi"), "url($1/pgs_admin/");
}

function applyStudentIdentity(html: string, state: Exclude<StudentExperience, { kind: "anonymous" }>, avatarUrl: string): string {
  const name = escapeHtml(state.name);
  const email = escapeHtml(state.user.email ?? "");
  const pathway = escapeHtml(state.profile.study_level || "STUDENT");
  return html
    .replace(/<h5 class="mb-3">User<\/h5>/i, `<h5 class="mb-3">${name}</h5>`)
    .replace(/<span>@user<\/span>/i, `<span>${email}</span>`)
    .replace(/<span>id:\s*<\/span>/i, "")
    .replace(/<h6 class="mb-0">stem PATHWAY<\/h6>/i, `<h6 class="mb-0">${pathway} PATHWAY</h6>`)
    .replace(/src=(["'])\/assets\/img\/default-avatar\.png\1/i, `src="${escapeHtml(avatarUrl)}"`);
}

export function RecoveredStudentLegacyPage({
  html,
  page,
  state,
  avatarUrl = "/assets/img/default-avatar.png"
}: {
  html: string;
  page: string;
  state: StudentExperience;
  avatarUrl?: string;
}) {
  let rendered = normalizeLegacyAssetPaths(keepPurpleBoardPublic(html));
  if (state.kind !== "anonymous") {
    rendered = applyAuthenticatedShell(rendered, {
      name: state.name,
      unreadCount: state.unreadCount,
      premium: state.kind === "authenticated_premium"
    });
    rendered = applyStudentIdentity(rendered, state, avatarUrl);
  }
  rendered = applyPremiumBusinessRule(rendered);
  return <LegacyPage page={page} html={rendered} studentState={state.kind} />;
}
