import { LegacyPage } from "@/components/legacy-page";
import { StaffPreviewBanner } from "@/components/staff-preview-banner";
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

function replaceFirstDivByClass(source: string, className: string, transform: (fragment: string) => string): string {
  const opening = new RegExp(`<div\\b[^>]*\\bclass=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`, "i").exec(source);
  if (!opening || opening.index === undefined) return source;
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = opening.index;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tags.exec(source))) {
    depth += /^<div\b/i.test(match[0]) ? 1 : -1;
    if (depth === 0) {
      const fragment = source.slice(opening.index, tags.lastIndex);
      return source.slice(0, opening.index) + transform(fragment) + source.slice(tags.lastIndex);
    }
  }
  return source;
}

export function applyStudentIdentity(html: string, state: Exclude<StudentExperience, { kind: "anonymous" }>, avatarUrl: string): string {
  const name = escapeHtml(state.name);
  const email = escapeHtml(state.user.email ?? "");
  const pathway = escapeHtml(state.profile.study_level || "STUDENT");
  const avatar = escapeHtml(avatarUrl);
  return replaceFirstDivByClass(html, "card-box-avatar", (card) => card
    .replace(/(<div\b[^>]*\bclass=["'][^"']*\bavatar_name\b[^"']*["'][^>]*>\s*<h5\b[^>]*>)[\s\S]*?(<\/h5>)/i,
      (_match, before: string, after: string) => `${before}${name}${after}`)
    .replace(/(<div\b[^>]*\bclass=["'][^"']*\bavatar_name\b[^"']*["'][^>]*>[\s\S]*?<\/h5>\s*<span\b[^>]*>)[\s\S]*?(<\/span>)/i,
      (_match, before: string, after: string) => `${before}${email}${after}`)
    .replace(/(<div\b[^>]*\bclass=["'][^"']*\btitle-info\b[^"']*["'][^>]*>[\s\S]*?<h5\b[^>]*>[\s\S]*?<\/h5>\s*<h6\b[^>]*>)[\s\S]*?(<\/h6>)/i,
      (_match, before: string, after: string) => `${before}${pathway} PATHWAY${after}`)
    .replace(/(<div\b[^>]*\bclass=["'][^"']*\bavatar-img\b[^"']*["'][^>]*>\s*<img\b[^>]*\bsrc=)(["'])[^"']*\2/i,
      (_match, before: string) => `${before}"${avatar}"`)
    .replace(/<span>id:\s*<\/span>/i, ""));
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
  return (
    <>
      {state.kind !== "anonymous" && state.preview ? (
        <StaffPreviewBanner actorName={state.preview.actorName} mode="student" targetName={state.preview.targetName} />
      ) : null}
      <LegacyPage page={page} html={rendered} studentState={state.kind} />
    </>
  );
}
