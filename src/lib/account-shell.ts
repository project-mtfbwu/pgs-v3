import { premiumLockedLabel, premiumShellDestination } from "@/lib/student-shell-contract";
import type { StudentHeaderNotification } from "@/lib/student-experience";

export type AccountShellState = {
  name: string;
  unreadCount: number;
  premium?: boolean;
  accountHref?: string;
  profileHref?: string;
  savedHref?: string;
  notifications?: StudentHeaderNotification[];
  notificationReadOnly?: boolean;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function attributeValue(attributes:string,name:string):string|null{
  const match=attributes.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`,`i`));
  return match?.[2]??null;
}

function setAttribute(attributes:string,name:string,value:string):string{
  const pattern=new RegExp(`(\\s${name}\\s*=\\s*)(["'])(.*?)\\2`,`i`);
  if(pattern.test(attributes))return attributes.replace(pattern,`$1"${escapeHtml(value)}"`);
  return `${attributes} ${name}="${escapeHtml(value)}"`;
}

function addClass(attributes:string,name:string):string{
  const classes=(attributeValue(attributes,"class")??"").split(/\s+/).filter(Boolean);
  if(!classes.includes(name))classes.push(name);
  return setAttribute(attributes,"class",classes.join(" "));
}

function visibleText(innerHtml:string):string{
  return innerHtml.replace(/<!--[\s\S]*?-->/g,"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
}

function replaceAccountAnchors(html:string,state:AccountShellState):string{
  const stateKind=state.premium?"authenticated_premium":"authenticated_standard";
  const premiumDestination=premiumShellDestination(stateKind);
  const accountHref=state.accountHref??"/student/dashboard";
  const profileHref=state.profileHref??"/student/profile";
  const savedHref=state.savedHref??"/saved";
  const premiumCta="Open Your <br> Premium <br> Dashboard";
  return html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi,(anchor:string,rawAttributes:string,innerHtml:string)=>{
    const href=attributeValue(rawAttributes,"href")??"";
    const classes=(attributeValue(rawAttributes,"class")??"").split(/\s+/);
    const text=visibleText(innerHtml);
    let attributes=rawAttributes;
    if(/^\/login$/i.test(href)&&classes.includes("btn-login")&&text==="Login"){
      attributes=setAttribute(attributes,"href",accountHref);
      attributes=addClass(attributes,"pgs-auth-account");
      attributes=setAttribute(attributes,"data-student-state",stateKind);
      return `<a${attributes}>${escapeHtml(state.name)}</a>`;
    }
    if(href==="#"&&/profile-icon/i.test(innerHtml)&&text==="Profile")return `<a${setAttribute(attributes,"href",profileHref)}>${innerHtml}</a>`;
    if(href==="#"&&/heart-icon/i.test(innerHtml)&&text==="Saved List")return `<a${setAttribute(attributes,"href",savedHref)}>${innerHtml}</a>`;
    if(/^\/login$/i.test(href)&&/logout/i.test(innerHtml)&&text==="Login"){
      attributes=setAttribute(attributes,"href","/logout");
      return `<a${attributes}>${innerHtml.replace(/Login(?=\s*$)/i,"Logout")}</a>`;
    }
    if(/^\/login\?redirect=(?:purplepremiumhome|simplehome)%3fopenpremium%3d1$/i.test(href)&&text==="Yet to Unlock Full Access"){
      if(!state.premium)return `<span class="premium-entitlement-locked">${premiumLockedLabel.replace("Yet to ","Yet to <br> ").replace("Full ","Full <br> ")}</span>`;
      attributes=setAttribute(attributes,"href",premiumDestination);
      return `<a${attributes}>${premiumCta}</a>`;
    }
    return anchor;
  });
}

function applyNotificationBadges(html:string,unreadCount:number):string{
  return html.replace(/<span\b([^>]*\bclass=["'][^"']*\bheader-notification-badge\b[^"']*["'][^>]*)>[\s\S]*?<\/span>/gi,(_span:string,rawAttributes:string)=>{
    let attributes=rawAttributes;
    const classes=(attributeValue(attributes,"class")??"").split(/\s+/).filter((name)=>name&&name!=="is-empty");
    if(unreadCount===0)classes.push("is-empty");
    attributes=setAttribute(attributes,"class",classes.join(" "));
    return `<span${attributes}>${unreadCount}</span>`;
  });
}

export function applyAuthenticatedShell(html: string, state: AccountShellState): string {
  const name = escapeHtml(state.name);
  const notifications = state.notifications ?? [];
  const notificationHtml = notifications.length
    ? `<div class="site-notification-items">${notifications.map((item) => `<article class="${item.read_at ? "is-read" : "is-unread"}"><button type="button" data-notification-open="${escapeHtml(item.id)}" data-notification-destination="${escapeHtml(item.destination_path ?? "")}"${state.notificationReadOnly ? ` data-notification-readonly="true"` : ""}><span>${escapeHtml(item.section ?? "PurpleGuide")}</span><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.body)}</p></button>${state.notificationReadOnly ? "" : `<button type="button" class="site-notification-delete" data-notification-delete="${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(item.title)}">×</button>`}</article>`).join("")}</div>${state.notificationReadOnly ? "" : `<button type="button" data-notification-clear="true">Clear all</button>`}<a href="/notifications">View all notifications</a>`
    : state.unreadCount
      ? `${state.unreadCount} unread notification${state.unreadCount===1?"":"s"}. <a href="/notifications">View notifications</a>`
      : `No notifications yet. <a href="/notifications">View notifications</a>`;
  return applyNotificationBadges(replaceAccountAnchors(html,state),state.unreadCount)
    .replace(/Welcome\s*<br\s*\/?>\s*User/g, () => `Welcome <br>${name}`)
    .replace(/<a\s+href=["']\/Login["']>\s*Sign in\s*<\/a>\s*to see your profile/gi, `<a href="/student/profile">View your profile</a>`)
    .replaceAll("No notifications yet.", notificationHtml);
}
