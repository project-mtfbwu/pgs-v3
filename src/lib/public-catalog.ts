import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getCatalogPreviewDraft, type CatalogPreviewEntity } from "@/lib/content-preview";
import { marketingMediaAlt, marketingMediaUrl, type MarketingMedia } from "@/lib/media-url";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveStudentPreviewTargetId } from "@/lib/staff-preview-server";

export type PublicCatalogCard = {
  id: number;
  title: string;
  summary: string;
  saved: boolean;
  imageUrl?: string;
  imageAlt?: string;
  tags?: string[];
};
export type PublicCatalogDetail = PublicCatalogCard & { description: string; kind: "programs" | "courses" };
export type PublicEvent = {
  id: number;
  title: string;
  summary: string;
  description: string;
  startsAt: string | null;
  endsAt: string | null;
  bookingUrl: string | null;
  host?: string;
  locationNote?: string;
  mode?: string;
  whoIsItFor?: string;
  sessionTopics?: string;
  whatWeCover?: string;
  imageUrl?: string;
  imageAlt?: string;
  tags?: string[];
  facilitators?: Array<{ name: string; role: string; biography: string; imageUrl: string; imageAlt: string }>;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] ?? character));
}

function tagNames(links: unknown): string[] {
  if (!Array.isArray(links)) return [];
  return links.flatMap((link) => {
    const tag = link && typeof link === "object" && "catalog_tags" in link ? (link as { catalog_tags?: { name?: unknown } | { name?: unknown }[] }).catalog_tags : null;
    const row = Array.isArray(tag) ? tag[0] : tag;
    return typeof row?.name === "string" && row.name.trim() ? [row.name.trim()] : [];
  });
}

async function savedLookupClient() {
  return (await getActiveStudentPreviewTargetId()) ? createSupabaseAdminClient() : await createSupabaseServerClient();
}

async function catalogPreviewRow(entity: CatalogPreviewEntity): Promise<Record<string, unknown> | null> {
  const draft = await getCatalogPreviewDraft(entity);
  if (!draft) return null;
  const server = await createSupabaseServerClient();
  const { data: live } = await server.from(entity).select("*").eq("id", draft.entityId).maybeSingle();
  const row: Record<string, unknown> = { ...(live ?? {}), ...draft.values, id: draft.entityId };
  const mediaId = typeof row.image_asset_id === "string" ? row.image_asset_id : null;
  if (mediaId) {
    const { data: media } = await server.from("media_assets").select("bucket,path,alt_text").eq("id", mediaId).maybeSingle();
    if (media) row.media_assets = media;
  }
  const tagKey = entity === "events" ? "event_tags" : entity === "courses" ? "course_tags" : entity === "programs" ? "program_tags" : "university_tags";
  if (draft.tagIds.length) {
    const { data: tags } = await server.from("catalog_tags").select("name").in("id", draft.tagIds);
    row[tagKey] = (tags ?? []).map((tag) => ({ catalog_tags: tag }));
  } else {
    row[tagKey] = [];
  }
  return row;
}

export async function getPublicCatalogCards(kind: "programs" | "courses", studentId?: string, featuredOnly = false): Promise<PublicCatalogCard[]> {
  const config = getSupabasePublicConfig();
  if (!config) return [];
  const client = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
  const mediaKey = kind === "programs" ? "media_assets!programs_image_asset_id_fkey" : "media_assets!courses_image_asset_id_fkey";
  const tagKey = kind === "programs" ? "program_tags" : "course_tags";
  let query = client.from(kind).select(`id,title,short_description,image_asset_id,featured,display_order,${mediaKey}(bucket,path,alt_text),${tagKey}(catalog_tags(name))`).eq("published", true);
  if (featuredOnly) query = query.eq("featured", true);
  const { data, error } = await query.order(kind === "programs" || featuredOnly ? "display_order" : "title").limit(60);
  if (error) return [];
  let savedIds = new Set<number>();
  if (studentId) {
    const server = await savedLookupClient();
    const savedTable = kind === "programs" ? "saved_programs" : "saved_courses";
    const idColumn = kind === "programs" ? "program_id" : "course_id";
    const saved = await server.from(savedTable).select(idColumn).eq("student_id", studentId);
    if (!saved.error) savedIds = new Set((saved.data ?? []).map((row) => Number(kind === "programs" ? (row as { program_id: unknown }).program_id : (row as { course_id: unknown }).course_id)));
  }
  const preview = await catalogPreviewRow(kind);
  const rows = [...(data ?? [])] as Array<Record<string, unknown>>;
  if (preview) {
    const index = rows.findIndex((row) => Number(row.id) === Number(preview.id));
    if (featuredOnly && preview.featured !== true) {
      if (index >= 0) rows.splice(index, 1);
    } else if (index >= 0) rows[index] = preview;
    else rows.push(preview);
  }
  rows.sort((left, right) => {
    if (kind === "programs" || featuredOnly) return Number(left.display_order ?? 0) - Number(right.display_order ?? 0);
    return String(left.title ?? "").localeCompare(String(right.title ?? ""));
  });
  return rows.map((row) => {
    const media = (row as { media_assets?: MarketingMedia }).media_assets;
    return {
      id: Number(row.id),
      title: String(row.title),
      summary: typeof row.short_description === "string" ? row.short_description : "",
      saved: savedIds.has(Number(row.id)),
      imageUrl: marketingMediaUrl(media),
      imageAlt: marketingMediaAlt(media, String(row.title)),
      tags: tagNames((row as { program_tags?: unknown; course_tags?: unknown }).program_tags ?? (row as { course_tags?: unknown }).course_tags)
    };
  });
}

export async function getPublicCatalogDetail(kind: "programs" | "courses", id: number, studentId?: string): Promise<PublicCatalogDetail | null> {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  const client = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
  const mediaKey = kind === "programs" ? "media_assets!programs_image_asset_id_fkey" : "media_assets!courses_image_asset_id_fkey";
  const tagKey = kind === "programs" ? "program_tags" : "course_tags";
  const { data, error } = await client.from(kind).select(`id,title,short_description,description,${mediaKey}(bucket,path,alt_text),${tagKey}(catalog_tags(name))`).eq("id", id).eq("published", true).maybeSingle();
  if (error) return null;
  const preview = await catalogPreviewRow(kind);
  const row = preview && Number(preview.id) === id ? preview : data as Record<string, unknown> | null;
  if (!row) return null;
  let saved = false;
  if (studentId) {
    const server = await savedLookupClient();
    const table = kind === "programs" ? "saved_programs" : "saved_courses";
    const column = kind === "programs" ? "program_id" : "course_id";
    const result = await server.from(table).select(column, { count: "exact", head: true }).eq("student_id", studentId).eq(column, id);
    saved = !result.error && Boolean(result.count);
  }
  const media = row.media_assets as MarketingMedia;
  return {
    kind,
    id: Number(row.id),
    title: String(row.title),
    summary: typeof row.short_description === "string" ? row.short_description : "",
    description: typeof row.description === "string" ? row.description : "",
    saved,
    imageUrl: marketingMediaUrl(media),
    imageAlt: marketingMediaAlt(media, String(row.title)),
    tags: tagNames(row[kind === "programs" ? "program_tags" : "course_tags"])
  };
}

function mapEvent(row: Record<string, unknown>): PublicEvent {
  const media = row.media_assets as MarketingMedia;
  return {
    id: Number(row.id),
    title: String(row.title),
    summary: typeof row.summary === "string" ? row.summary : "",
    description: typeof row.description === "string" ? row.description : "",
    startsAt: typeof row.starts_at === "string" ? row.starts_at : null,
    endsAt: typeof row.ends_at === "string" ? row.ends_at : null,
    bookingUrl: typeof row.booking_url === "string" ? row.booking_url : null,
    host: typeof row.host === "string" ? row.host : "",
    locationNote: typeof row.location_note === "string" ? row.location_note : "",
    mode: typeof row.mode === "string" ? row.mode : "",
    whoIsItFor: typeof row.who_is_it_for === "string" ? row.who_is_it_for : "",
    sessionTopics: typeof row.session_topics === "string" ? row.session_topics : "",
    whatWeCover: typeof row.what_we_cover === "string" ? row.what_we_cover : "",
    imageUrl: marketingMediaUrl(media),
    imageAlt: marketingMediaAlt(media, String(row.title)),
    tags: tagNames(row.event_tags)
  };
}

const eventSelect = "id,title,summary,description,starts_at,ends_at,booking_url,host,location_note,mode,who_is_it_for,session_topics,what_we_cover,display_order,media_assets!events_image_asset_id_fkey(bucket,path,alt_text),event_tags(catalog_tags(name))";

export async function getPublicEvents(): Promise<PublicEvent[]> {
  const config = getSupabasePublicConfig();
  if (!config) return [];
  const client = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.from("events").select(eventSelect).eq("published", true).order("starts_at").limit(60);
  if (error) return [];
  const rows = (data ?? []).map((row) => row as Record<string, unknown>);
  const preview = await catalogPreviewRow("events");
  if (preview) {
    const index = rows.findIndex((row) => Number(row.id) === Number(preview.id));
    if (index >= 0) rows[index] = preview;
    else rows.push(preview);
  }
  rows.sort((left, right) => {
    const order = Number(left.display_order ?? 0) - Number(right.display_order ?? 0);
    return order || String(left.starts_at ?? "").localeCompare(String(right.starts_at ?? ""));
  });
  return rows.map(mapEvent);
}

export async function getPublicEvent(id: number): Promise<PublicEvent | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const config = getSupabasePublicConfig();
  if (!config) return null;
  const client = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.from("events").select(eventSelect).eq("id", id).eq("published", true).maybeSingle();
  if (error) return null;
  const preview = await catalogPreviewRow("events");
  const row = preview && Number(preview.id) === id ? preview : data as Record<string, unknown> | null;
  if (!row) return null;
  const event = mapEvent(row);
  const { data: facilitators } = await client.from("event_facilitators").select("name,role,biography,media_assets!event_facilitators_image_asset_id_fkey(bucket,path,alt_text)").eq("event_id", id).order("display_order");
  event.facilitators = (facilitators ?? []).map((row) => {
    const media = (row as { media_assets?: MarketingMedia }).media_assets;
    return {
      name: String(row.name),
      role: typeof row.role === "string" ? row.role : "",
      biography: typeof row.biography === "string" ? row.biography : "",
      imageUrl: marketingMediaUrl(media),
      imageAlt: marketingMediaAlt(media, String(row.name))
    };
  });
  return event;
}

function cardsHtml(kind: "programs" | "courses", cards: PublicCatalogCard[]): string {
  const singular = kind === "programs" ? "program" : "course";
  return cards.map((card) => {
    const image = card.imageUrl ? `<img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.imageAlt || card.title)}">` : "";
    const tags = card.tags?.length ? `<div class="sop-tags px-2 py-2 mb-0 mt-3">${card.tags.map((tag) => `<span class="sop-tag">#${escapeHtml(tag)}</span>`).join("")}</div>` : "";
    return `<article class="col-lg-4 col-md-6 col-12 pgs-relational-catalog-card" data-${singular}-id="${card.id}"><div class="card-line h-100"><a href="/programsfull/program/${card.id}${kind === "courses" ? "?type=course" : ""}" class="text-black text-decoration-none">${image}<h3 class="fnt-family fs-28">${escapeHtml(card.title)}</h3><p>${escapeHtml(card.summary)}</p></a>${tags}<button type="button" class="save-${singular}${card.saved ? " is-saved" : ""}" data-save-id="${card.id}" aria-label="${card.saved ? "Remove from saved" : "Save"}">${card.saved ? "♥" : "♡"}</button></div></article>`;
  }).join("");
}

export function applyPublishedCatalogCards(html: string, kind: "programs" | "courses", cards: PublicCatalogCard[]): string {
  if (!cards.length) return html;
  const rendered = cardsHtml(kind, cards);
  if (kind === "programs") {
    return html.replace(/<div class="d-flex wrap align-items-start gap-3 mt-3 justify-content-center">\s*<p class="text-muted">No programs yet\. Check back later\.<\/p>\s*<\/div>/i, `<div class="d-flex wrap align-items-start gap-3 mt-3 justify-content-center" data-relational-catalog="programs">${rendered}</div>`);
  }
  return html.replace(/<div class="row align-items-start justify-content-md-start mobile-row-0" id="purpleboardCourses">\s*<div class="col-12 text-center py-5">\s*<p class="text-muted mb-0">No courses available yet\. Courses added in admin will appear here\.<\/p>\s*<\/div>\s*<\/div>/i, `<div class="row align-items-start justify-content-md-start mobile-row-0" id="purpleboardCourses" data-relational-catalog="courses">${rendered}</div>`);
}

export function applyFeaturedCatalogCards(html: string, kind: "programs" | "courses", cards: PublicCatalogCard[]): string {
  const rendered = cards.length ? cardsHtml(kind, cards) : "";
  if (kind === "courses") {
    return html.replace(/<div class="box-style-45 d-flex align-items-stretch gap-3 justify-content-center flex-wrap">\s*<p class="text-muted">No featured courses yet\. Mark courses as "show in picks" in admin\.<\/p>\s*<\/div>/i, `<div class="box-style-45 d-flex align-items-stretch gap-3 justify-content-center flex-wrap" data-relational-catalog="featured-courses">${rendered || '<p class="text-muted">No featured courses yet. Mark courses as "show in picks" in admin.</p>'}</div>`);
  }
  return html.replace(/<div class="box-style-45 d-flex align-items-start gap-3 justify-content-center flex-wrap">\s*<p class="text-muted">No featured programs yet\. Add programs in admin\.<\/p>\s*<\/div>/i, `<div class="box-style-45 d-flex align-items-start gap-3 justify-content-center flex-wrap" data-relational-catalog="featured-programs">${rendered || '<p class="text-muted">No featured programs yet. Add programs in admin.</p>'}</div>`);
}

export function applyPublishedCatalogDetail(html: string, detail: PublicCatalogDetail): string {
  const singular = detail.kind === "programs" ? "program" : "course";
  let result = html
    .replace(/(<div class="sop-image-wrapper-1 w-100">)/i, `$1<div data-${singular}-id="${detail.id}" hidden></div>`)
    .replace(/>\s*Program details\s*<\/h1>/i, `>${escapeHtml(detail.title)}</h1>`)
    .replace(/(<div class="mt-2 mobile-w-70 mobile-m-auto mobile-pb-4 mobile-pt-2">\s*<span[^>]*>)\s*(<\/span>)/i, `$1${escapeHtml(detail.summary || detail.description)}$2`)
    .replace(/<div class="sop-heart-icon bg-purple text-white px-1 fs-16 border-radius-6px">\s*<\/div>/i, `<button type="button" class="sop-heart-icon bg-purple text-white px-1 fs-16 border-radius-6px save-${singular}${detail.saved ? " is-saved" : ""}" data-save-id="${detail.id}" aria-label="${detail.saved ? "Remove from saved" : "Save"}">${detail.saved ? "♥" : "♡"}</button>`);
  if (detail.imageUrl) {
    result = result.replace(/(<div class="sop-image-wrapper-1 w-100">[\s\S]*?<img )src="[^"]*"/i, `$1src="${escapeHtml(detail.imageUrl)}" alt="${escapeHtml(detail.imageAlt || detail.title)}"`);
  }
  if (detail.tags?.length) {
    const tagsHtml = `<div class="sop-tags px-2 py-2 mb-0 mt-3">${detail.tags.map((tag) => `<span class="sop-tag">#${escapeHtml(tag)}</span>`).join("")}</div>`;
    if (/<div class="sop-tags[\s\S]*?<\/div>/i.test(result)) {
      result = result.replace(/<div class="sop-tags[\s\S]*?<\/div>/i, tagsHtml);
    } else {
      result = result.replace(/(<button type="button" class="sop-heart-icon[\s\S]*?<\/button>)/i, `$1${tagsHtml}`);
    }
  }
  return result;
}

function eventDate(value: string | null): { day: string; month: string; time: string } {
  if (!value) return { day: "—", month: "Date TBC", time: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: "—", month: "Date TBC", time: "" };
  return {
    day: new Intl.DateTimeFormat("en-GB", { day: "2-digit", timeZone: "UTC" }).format(date),
    month: new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date),
    time: new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(date)
  };
}

function topicLines(value?: string): string {
  if (!value?.trim()) return "";
  return value.split(/\n+|,\s*/).filter(Boolean).map((topic) => `<h6 class="mb-0 text-black fw-400 fs-15 lh-20">${escapeHtml(topic.trim())}</h6>`).join("");
}

function eventCardInner(event: PublicEvent): string {
  const start = eventDate(event.startsAt);
  const end = eventDate(event.endsAt);
  const image = event.imageUrl
    ? `<div class="img-left-absoulute"><figure class="position-relative m-0 text-center"><img src="${escapeHtml(event.imageUrl)}" alt="${escapeHtml(event.imageAlt || event.title)}"></figure></div>`
    : "";
  const who = event.whoIsItFor || event.summary;
  return `<div class="card-box-gradiant border p-4"><div class="card-box-gradiant-header purple-dot"><h5 class="mb-0">${escapeHtml(event.title)}</h5></div><div class="date-box"><div><div class="box-date-info"><span class="date">${start.day}</span><span class="month">${start.month}</span></div><p class="mb-0 text-black fw-600 fs-12 lh-16 mt-2">${start.time}</p></div>${event.endsAt ? `<div><div class="box-date-info"><span class="date">${end.day}</span><span class="month">${end.month}</span></div><p class="mb-0 text-black fw-600 fs-12 lh-16 mt-2">${end.time}</p></div>` : ""}</div>${who ? `<div class="btn-content w-50"><h5 class="mb-0 text-black fw-600 fs-16 lh-24">Who's It For?</h5><p class="mb-0 fs-14 lh-18 text-black">${escapeHtml(who)}</p></div>` : ""}${event.sessionTopics ? `<div class="text-content"><h5 class="mb-0 text-black fw-400 fs-16 lh-24">Topics Covered</h5>${topicLines(event.sessionTopics)}</div>` : ""}<div class="d-flex justify-content-space"><a href="/purpleevents/session/${event.id}" class="sop-learn-btn bg-blue-500 mt-4 fs-12 ht-32 text-decoration-none text-black d-inline-flex align-items-center justify-content-center">Learn More</a></div>${image}</div>`;
}

function mobileEventCards(events: PublicEvent[]): string {
  if (!events.length) return `<div class="d-flex wrap gap-3 justify-content-center" data-relational-events><p class="text-muted">No upcoming sessions yet.</p></div>`;
  return `<div class="d-flex wrap gap-3 justify-content-center" data-relational-events>${events.map((event) => `<article class="overflow-hidden border-radius-16px w-383px box-border-fix">${eventCardInner(event)}</article>`).join("")}</div>`;
}

function desktopEventSlides(events: PublicEvent[]): string {
  if (!events.length) return `<div class="swiper-slide" data-relational-events><p class="text-muted">No upcoming sessions yet.</p></div>`;
  return events.map((event) => `<div class="swiper-slide overflow-hidden border-radius-16px w-383px box-border-fix" data-relational-events>${eventCardInner(event)}</div>`).join("");
}

export function applyPublishedEvents(html: string, events: PublicEvent[]): string {
  const mobile = mobileEventCards(events);
  const desktop = desktopEventSlides(events);
  let result = html.replace(
    /(<section class="pt-3 mobile-event-program desktop-none">[\s\S]*?<span class="mobile-fs-24">[^<]*<\/span>\s*<\/h1>\s*<\/div>)[\s\S]*?(<\/div>\s*<\/div>\s*<\/section>)/i,
    `$1${mobile}$2`
  );
  if (result === html) {
    result = html.replace(
      /(<span class="mobile-fs-24">[^<]*<\/span>\s*<\/h1>\s*<\/div>)[\s\S]*?(<div class="overflow-hidden border-radius-16px w-383px[\s\S]*?<\/div>)/i,
      `$1${mobile}`
    );
  }
  const withDesktop = result.replace(
    /(<div class="swiper-wrapper purple-teams"[^>]*>)[\s\S]*?(<span class="swiper-notification")/i,
    `$1${desktop}$2`
  );
  if (withDesktop !== result) return withDesktop;
  return result.replace(
    /(<h1 class="fnt-family fs-50 mb-0 text-black">[^<]*<\/h1>\s*<\/div>\s*<\/div>)[\s\S]*?(<div class="row align-items-center)/i,
    `$1${mobile}$2`
  );
}

export function applyPublishedEventDetail(html: string, event: PublicEvent): string {
  const booking = event.bookingUrl && /^https?:\/\//i.test(event.bookingUrl) ? event.bookingUrl : "/contact";
  let result = html
    .replace(/(<div class="w-70">\s*<h1[^>]*>)[\s\S]*?(<\/h1>)/i, `$1${escapeHtml(event.title)}$2`)
    .replace(/<button type="button" class="sop-learn-btn bg-blue-500 mt-2 fs-17 w-100 fw-600 text-black border-radius-4px py-2 ht-48">[\s\S]*?<\/button>/i, `<a href="${escapeHtml(booking)}" class="sop-learn-btn bg-blue-500 mt-2 fs-17 w-100 fw-600 text-black border-radius-4px py-2 ht-48 d-inline-flex align-items-center justify-content-center">Book Your Seat</a>`);
  if (event.host) result = result.replace(/(<span class="text-dark-gray fs-14">)[^<]*(<\/span>)/i, `$1${escapeHtml(event.host)}$2`);
  if (event.whoIsItFor) result = result.replace(/(<div class="content-p mobile-w-50">[\s\S]*?<p class="mb-0 text-black fs-12 lh-12">)[\s\S]*?(<\/p>)/i, `$1${escapeHtml(event.whoIsItFor)}$2`);
  if (event.imageUrl) result = result.replace(/(<div class="sop-image-wrapper-1 w-100">[\s\S]*?<img )src="[^"]*"/i, `$1src="${escapeHtml(event.imageUrl)}" alt="${escapeHtml(event.imageAlt || event.title)}"`);
  if (event.tags?.length) {
    result = result.replace(/<div class="sop-tags px-2 py-2 mb-0 mt-3">[\s\S]*?<\/div>/i, `<div class="sop-tags px-2 py-2 mb-0 mt-3">${event.tags.map((tag) => `<span class="sop-tag">#${escapeHtml(tag)}</span>`).join("")}</div>`);
  }
  return result;
}
