import { createClient } from "@supabase/supabase-js";
import { getCmsPreviewRevision } from "@/lib/content-preview";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export type HomeContent = {
  heroSupport: string;
  introTitle: string;
  introBody: string;
};

export type UsaContent = {
  titleLineOne: string;
  titleLineTwo: string;
  subtitle: string;
  kicker: string;
  contactCta: string;
};

export type PageContentMap = {
  home: HomeContent;
  countriesusa: UsaContent;
};

export const defaultPageContent: PageContentMap = {
  home: {
    heroSupport: "Join #PGS — whether it’s Medical Pathway, STEM, Master’s, or other programs, we’ve got your admission roadmap.",
    introTitle: "One of the best parts of #PGS? The Student Dashboard.",
    introBody: "Get real-time updates, mentor feedback, and full progress tracking—every step from Day 1 to your admit. Everything stays mapped, organized, and right here in one place."
  },
  countriesusa: {
    titleLineOne: "Comprehensive Guide to",
    titleLineTwo: "Studying in the USA",
    subtitle: "Best Universities, Programs, Costs & Admission Criteria for International Students",
    kicker: "For Medical, STEM, and More—We’ve Got You Covered",
    contactCta: "Got Questions? Talk to Us"
  }
};

export async function getPageContent<TSlug extends keyof PageContentMap>(slug: TSlug): Promise<PageContentMap[TSlug]> {
  const preview = await getCmsPreviewRevision(slug);
  if (preview?.content && typeof preview.content === "object") {
    return { ...defaultPageContent[slug], ...(preview.content as Partial<PageContentMap[TSlug]>) };
  }
  const config=getSupabasePublicConfig();
  if(!config)return defaultPageContent[slug];

  const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
  const { data: cmsPage } = await client.from("cms_pages").select("published_revision_id").eq("slug", slug).eq("status", "published").maybeSingle();
  if (cmsPage?.published_revision_id) {
    const { data: revision } = await client.from("cms_page_revisions").select("content").eq("id", cmsPage.published_revision_id).maybeSingle();
    if (revision?.content && typeof revision.content === "object") return { ...defaultPageContent[slug], ...(revision.content as Partial<PageContentMap[TSlug]>) };
  }
  const { data, error } = await client
    .from("page_content")
    .select("content")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error || !data?.content || typeof data.content !== "object") return defaultPageContent[slug];
  return { ...defaultPageContent[slug], ...(data.content as Partial<PageContentMap[TSlug]>) };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character] ?? character);
}

export function applyHomeContent(html: string, content: HomeContent): string {
  return html
    .replace(/Join #PGS — whether it’s Medical Pathway, STEM, Master’s, or other programs, we’ve\s+got your admission roadmap\./, escapeHtml(content.heroSupport))
    .replace(/One of the best parts of #PGS\?\s*<br\s*\/?>(?:\s*)The Student Dashboard\./i, escapeHtml(content.introTitle))
    .replace(/Get real-time updates, mentor feedback, and full progress tracking—every step from Day 1 to\s*your\s*admit\.\s*Everything stays mapped, organized, and right here in one place\./i, escapeHtml(content.introBody));
}

export function applyUsaContent(html: string, content: UsaContent): string {
  return html
    .replace(/Comprehensive Guide to\s*<br\s*\/?>(?:\s*)Studying in the USA/i, `${escapeHtml(content.titleLineOne)} <br/> ${escapeHtml(content.titleLineTwo)}`)
    .replace(/Best Universities, Programs, Costs &amp;\s*Admission Criteria\s*for International Students/i, escapeHtml(content.subtitle))
    .replace(/For Medical, STEM, and More—We’ve Got You\s*Covered/i, escapeHtml(content.kicker))
    .replace(/Got Questions\? Talk to Us/i, escapeHtml(content.contactCta));
}
