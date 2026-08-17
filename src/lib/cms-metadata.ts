import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { defaultPageContent } from "@/lib/content";
import { defaultPublicContent, type PublicContentSlug } from "@/lib/public-content";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

const slugRoutes: Record<string, string> = {
  home: "/",
  countriesusa: "/countriesusa",
  about: "/about",
  contact: "/contact",
  countriesaus: "/countriesaus",
  countriescanada: "/countriescanada",
  countrieseurope: "/countrieseurope",
  countriesfrance: "/countriesfrance",
  countriesgermany: "/countriesgermany",
  countriesmauritius: "/countriesmauritius",
  countriesnz: "/countriesnz",
  countriesothers: "/countriesothers",
  countriesuk: "/countriesuk",
  cvreadyprogram: "/cvreadyprogram",
  explorecountries: "/explorecountries",
  finance: "/finance",
  "forgot-password": "/forgot_password",
  login: "/login",
  "program-detail": "/programsfull/program",
  purpleamc: "/purpleamc",
  purpleboard: "/purpleboard",
  purpleevents: "/purpleevents",
  "purpleevents-session": "/purpleevents/session",
  purplenonmedical: "/purplenonmedical",
  purpleplab: "/purpleplab",
  purplepremiumhome: "/purplepremiumhome",
  purpleusme: "/purpleusme",
  scholarship: "/scholarship",
  simplehome: "/simplehome",
  signup: "/singup",
  studentresources: "/studentresources",
  unitieup: "/unitieup",
  usmlerotation: "/usmlerotation",
  "reset-password": "/reset_password",
  "change-password": "/change_password",
  "error-404": "/error_404"
};

export function fallbackSeo(slug: string): { title: string; description: string } {
  if (slug in defaultPublicContent) {
    const content = defaultPublicContent[slug as PublicContentSlug];
    return { title: content.seoTitle, description: content.seoDescription };
  }
  if (slug === "home") {
    return { title: "Get your details here", description: defaultPageContent.home.heroSupport };
  }
  if (slug === "countriesusa") {
    return { title: "Study in the USA", description: defaultPageContent.countriesusa.subtitle };
  }
  return { title: slug.replaceAll("-", " "), description: "PurpleGuide" };
}

export function mergeCmsSeo(
  fallback: { title: string; description: string },
  page: { seo_title?: string | null; seo_description?: string | null; open_graph?: unknown } | null
): Metadata {
  let title = fallback.title;
  let description = fallback.description;
  if (page) {
    if (typeof page.seo_title === "string" && page.seo_title.trim()) title = page.seo_title.trim();
    if (typeof page.seo_description === "string" && page.seo_description.trim()) description = page.seo_description.trim();
  }
  let ogTitle = title;
  let ogDescription = description;
  const openGraph = page?.open_graph && typeof page.open_graph === "object" ? page.open_graph as Record<string, unknown> : {};
  if (typeof openGraph.title === "string" && openGraph.title.trim()) ogTitle = openGraph.title.trim();
  if (typeof openGraph.description === "string" && openGraph.description.trim()) ogDescription = openGraph.description.trim();
  return { title, description, openGraph: { title: ogTitle, description: ogDescription } };
}

export async function cmsMetadata(slug: string): Promise<Metadata> {
  const fallback = fallbackSeo(slug);
  const config = getSupabasePublicConfig();
  let page: { seo_title?: string | null; seo_description?: string | null; open_graph?: unknown } | null = null;
  if (config) {
    const client = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await client.from("cms_pages").select("seo_title,seo_description,open_graph,status").eq("slug", slug).eq("status", "published").maybeSingle();
    page = data;
  }
  const metadata = mergeCmsSeo(fallback, page);
  const path = slugRoutes[slug] ?? `/${slug}`;
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, url: path }
  };
}
