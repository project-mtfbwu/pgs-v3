import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { contactHtml } from "@/legacy/generated/contact";

export const metadata: Metadata = { title: "Contact PurpleGuide" };
// The retained theme binds `.submit` to its retired AJAX transport. Removing only
// that behavior hook leaves the approved button styling intact and lets V3 own persistence.
const contactV3Html = contactHtml.replaceAll(" submit w-100", " w-100");

export default function ContactPage() { return <PublicLegacyPage slug="contact" html={contactV3Html} />; }
