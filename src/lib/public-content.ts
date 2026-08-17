import { createClient } from "@supabase/supabase-js";
import { getCmsPreviewRevision } from "@/lib/content-preview";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export type SeoSlots = {
  seoTitle: string;
  seoDescription: string;
  openGraphTitle: string;
  openGraphDescription: string;
};

export type DestinationContent = SeoSlots & {
  destinationName: string;
  titleLineOne: string;
  titleLineTwo: string;
  subtitle: string;
  kicker: string;
  contactCta: string;
};

export type AboutContent = SeoSlots & {
  heroHeading: string;
  acceptanceHeading: string;
  audienceHeading: string;
};

export type ContactContent = SeoSlots & {
  heroHeading: string;
  supportHeading: string;
  formHeading: string;
  submitLabel: string;
};

export type ExploreCountriesContent = SeoSlots & { heroHeading: string; primaryCta: string };
export type FinanceContent = SeoSlots & { heroHeading: string; introHeading: string; fundingCta: string; faqHeading: string };
export type ScholarshipContent = SeoSlots & { heroHeading: string; scenariosHeading: string; applicationCta: string };
export type PathwayContent = SeoSlots & { heroHeading: string; premiumHeading: string; pathwayHeading: string; applicationCta: string };
export type CatalogContent = SeoSlots & { heroHeading: string; filterHeading: string; saveLoginPrompt: string };
export type EventsContent = SeoSlots & { sessionsHeading: string; topicsHeading: string; bookingCta: string };
export type StudentResourcesContent = SeoSlots & { datesHeading: string; deadlinesHeading: string; factsHeading: string; subscribeCta: string };
export type PremiumLandingContent = SeoSlots & { heroHeading: string; overviewLabel: string; applicationCta: string; videoCta: string };
export type TieUpContent = SeoSlots & { heroHeading: string; initiativesHeading: string; partnershipCta: string };
export type RotationContent = SeoSlots & { heroHeading: string; benefitHeading: string; applicationCta: string };
export type AuthContent = SeoSlots & { heading: string; submitLabel: string };
export type ErrorContent = SeoSlots & { heading: string; homeCta: string };

export type PublicContentMap = {
  about: AboutContent;
  contact: ContactContent;
  countriesaus: DestinationContent;
  countriescanada: DestinationContent;
  countrieseurope: DestinationContent;
  countriesfrance: DestinationContent;
  countriesgermany: DestinationContent;
  countriesmauritius: DestinationContent;
  countriesnz: DestinationContent;
  countriesothers: DestinationContent;
  countriesuk: DestinationContent;
  cvreadyprogram: CatalogContent;
  explorecountries: ExploreCountriesContent;
  finance: FinanceContent;
  "forgot-password": AuthContent;
  login: AuthContent;
  "program-detail": CatalogContent;
  purpleamc: PathwayContent;
  purpleboard: CatalogContent;
  purpleevents: EventsContent;
  "purpleevents-session": EventsContent;
  purplenonmedical: PathwayContent;
  purpleplab: PathwayContent;
  purplepremiumhome: PremiumLandingContent;
  purpleusme: PathwayContent;
  scholarship: ScholarshipContent;
  simplehome: PremiumLandingContent;
  signup: AuthContent;
  studentresources: StudentResourcesContent;
  unitieup: TieUpContent;
  usmlerotation: RotationContent;
  "reset-password": AuthContent;
  "change-password": AuthContent;
  "error-404": ErrorContent;
};

export type PublicContentSlug = keyof PublicContentMap;

const seo = (title: string, description: string): SeoSlots => ({
  seoTitle: title,
  seoDescription: description,
  openGraphTitle: title,
  openGraphDescription: description
});

const destination = (destinationName: string, titleLineTwo: string): DestinationContent => ({
  ...seo(`Study in ${destinationName}`, `PurpleGuide study, admission, cost, visa and scholarship guidance for ${destinationName}.`),
  destinationName,
  titleLineOne: "Comprehensive Guide to",
  titleLineTwo,
  subtitle: "Best Universities, Programs, Costs & Admission Criteria for International Students",
  kicker: "For Medical, STEM, and More—We’ve Got You Covered",
  contactCta: "Got Questions? Talk to Us"
});

const pathway = (title: string): PathwayContent => ({
  ...seo(title, `${title} pathway guidance from PurpleGuide.`),
  heroHeading: "Get Into Your Dream University Abroad with a Structured Workflow",
  premiumHeading: "Why We Built #PurplePremium (And Why It Matters)",
  pathwayHeading: "#purplePremium MEDICAL PATHWAY",
  applicationCta: "Request it here"
});

export const defaultPublicContent: PublicContentMap = {
  about: { ...seo("About PurpleGuide", "Meet PurpleGuide and the admission experts behind #PGS."), heroHeading: "#PGS Scholarship Guide", acceptanceHeading: "Why 98% of Our Students Get Accepted", audienceHeading: "Who is #PGS for?" },
  contact: { ...seo("Contact PurpleGuide", "Contact PurpleGuide for study-abroad and admissions guidance."), heroHeading: "Contact us", supportHeading: "Do you need help? Contact with us now!", formHeading: "Get In Touch", submitLabel: "Send message" },
  countriesaus: destination("Australia", "Studying in Australia"),
  countriescanada: destination("Canada", "Studying in Canada"),
  countrieseurope: destination("Europe", "Studying in Europe"),
  countriesfrance: destination("France", "Studying in France"),
  countriesgermany: destination("Germany", "Studying in Germany"),
  countriesmauritius: destination("Mauritius", "Studying in Mauritius"),
  countriesnz: destination("New Zealand", "Studying in New Zealand"),
  countriesothers: destination("Abroad", "Studying Abroad"),
  countriesuk: destination("the UK", "Studying in the UK"),
  cvreadyprogram: { ...seo("CV-Ready Programs", "Explore PurpleGuide programs and courses that strengthen your profile."), heroHeading: "Courses That Actually Count", filterHeading: "Filter out above or select a pre selected group below.", saveLoginPrompt: "Log in to save this program" },
  explorecountries: { ...seo("Explore Countries", "Compare PurpleGuide study destinations."), heroHeading: "Get Into Your Dream University Abroad with a Structured Workflow", primaryCta: "Explore Countries" },
  finance: { ...seo("Study Abroad Finance", "Education loan and study-abroad funding guidance."), heroHeading: "Secure Your Abroad Education Loan starting at 8.33%*", introHeading: "Your study plan’s ready. Is your funding too ?", fundingCta: "Talk to our funding team today!", faqHeading: "FAQ’s" },
  "forgot-password": { ...seo("Reset your password", "Secure PurpleGuide account recovery."), heading: "Time for a quick security refresh?", submitLabel: "Send reset link" },
  login: { ...seo("Log in to PurpleGuide", "Secure access to your PurpleGuide student account."), heading: "Welcome back", submitLabel: "Login" },
  "program-detail": { ...seo("Program Details", "PurpleGuide program details, highlights, eligibility and fees."), heroHeading: "Program details", filterHeading: "explore Program Highlights", saveLoginPrompt: "Log in to save this program" },
  purpleamc: pathway("AMC Pathway"),
  purpleboard: { ...seo("Purple Board", "PurpleGuide courses and weekly wall."), heroHeading: "#purpleboard", filterHeading: "#weeklywall", saveLoginPrompt: "Log in to save this course" },
  purpleevents: { ...seo("Purple Events", "Discover upcoming PurpleGuide sessions and facilitators."), sessionsHeading: "Upcoming Sessions", topicsHeading: "What We’ll Cover in This Session:", bookingCta: "Book Now" },
  "purpleevents-session": { ...seo("Purple Event Session", "PurpleGuide event session details and booking."), sessionsHeading: "Upcoming Sessions", topicsHeading: "What We’ll Cover in This Session", bookingCta: "Book Now" },
  purplenonmedical: pathway("Non-Medical Pathway"),
  purpleplab: pathway("PLAB Pathway"),
  purplepremiumhome: { ...seo("Purple Premium", "Explore PurpleGuide Premium guidance and workflows."), heroHeading: "Explore #PGS", overviewLabel: "OVERVIEW", applicationCta: "Join Purple Premium", videoCta: "Watch Video" },
  purpleusme: pathway("USMLE Pathway"),
  scholarship: { ...seo("PurpleGuide Scholarship Guide", "Find and prepare for study-abroad scholarships."), heroHeading: "#PGS Scholarship Guide", scenariosHeading: "We’ve added a few common student scenarios below", applicationCta: "Apply Now" },
  simplehome: { ...seo("PurpleGuide", "PurpleGuide study-abroad admissions guidance."), heroHeading: "#pgs", overviewLabel: "OVERVIEW", applicationCta: "Join Purple Premium", videoCta: "Watch Video" },
  signup: { ...seo("Complete your PurpleGuide profile", "Complete your secure PurpleGuide student profile."), heading: "Complete your profile", submitLabel: "Continue" },
  studentresources: { ...seo("Student Resources", "Key dates, deadlines, facts and events for study-abroad applicants."), datesHeading: "Upcoming Key Dates", deadlinesHeading: "Deadlines & Updates", factsHeading: "Study Abroad Facts You Probably Didn’t Know", subscribeCta: "Subscribe" },
  unitieup: { ...seo("University Partnerships", "Partner with PurpleGuide on university initiatives."), heroHeading: "with university partnerships", initiativesHeading: "Co-Developed Initiatives", partnershipCta: "Ready to Partner With Us?" },
  usmlerotation: { ...seo("USA Clinical Rotations", "Clinical rotation guidance for international medical graduates."), heroHeading: "USA Clinical Rotations", benefitHeading: "For International Medical Graduates (IMGs) going to the USA, clinical rotations are your chance to:", applicationCta: "START YOUR USA CLINICAL EXPERIENCE THE RIGHT WAY." },
  "reset-password": { ...seo("Choose a new password", "Secure PurpleGuide password reset."), heading: "Create a new password", submitLabel: "Reset password" },
  "change-password": { ...seo("Change your password", "Secure PurpleGuide password change."), heading: "Change password", submitLabel: "Update password" },
  "error-404": { ...seo("Page not found", "The requested PurpleGuide page could not be found."), heading: "That didn’t load!", homeCta: "Back to home" }
};

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeKnownStringSlots<T extends Record<string, string>>(fallback: T, value: unknown): T {
  if (!isStringRecord(value)) return fallback;
  const merged = { ...fallback };
  for (const key of Object.keys(fallback) as Array<keyof T>) {
    if (typeof value[key as string] === "string") merged[key] = value[key as string] as T[keyof T];
  }
  return merged;
}

export async function getPublicContent<TSlug extends PublicContentSlug>(slug: TSlug): Promise<PublicContentMap[TSlug]> {
  const fallback = defaultPublicContent[slug];
  const preview = await getCmsPreviewRevision(slug);
  if (preview?.content) return mergeKnownStringSlots(fallback, preview.content) as PublicContentMap[TSlug];
  const config=getSupabasePublicConfig();
  if(!config)return fallback;

  const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
  const { data: page } = await client.from("cms_pages").select("published_revision_id").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!page?.published_revision_id) return fallback;
  const { data: revision } = await client.from("cms_page_revisions").select("content").eq("id", page.published_revision_id).maybeSingle();
  return mergeKnownStringSlots(fallback, revision?.content) as PublicContentMap[TSlug];
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character] ?? character);
}

function replaceText(html: string, current: string, next: string): string {
  return current === next ? html : html.replaceAll(current, escapeHtml(next));
}

export function applyPublicContent<TSlug extends PublicContentSlug>(slug: TSlug, html: string, content: PublicContentMap[TSlug]): string {
  const fallback = defaultPublicContent[slug];
  const fallbackSlots = fallback as unknown as Record<string, string>;
  const contentSlots = content as unknown as Record<string, string>;
  let result = html;
  for (const key of Object.keys(fallbackSlots)) {
    if (key === "seoTitle" || key === "seoDescription" || key === "openGraphTitle" || key === "openGraphDescription" || key === "destinationName") continue;
    result = replaceText(result, fallbackSlots[key], contentSlots[key]);
  }
  if ("titleLineOne" in content && "titleLineTwo" in content) {
    result = result.replace(/Comprehensive Guide to\s*<br\s*\/?>(?:\s*)Studying (?:in )?(?:the )?(?:USA|Australia|Canada|Europe|France|Germany|Mauritius|New Zealand|Abroad|UK)/i,
      `${escapeHtml(content.titleLineOne)} <br/> ${escapeHtml(content.titleLineTwo)}`);
  }
  return result;
}
