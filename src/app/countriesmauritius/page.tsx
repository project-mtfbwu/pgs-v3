import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesMauritiusHtml } from "@/legacy/generated/countriesmauritius";

export const metadata: Metadata = { title: "Study in Mauritius" };
export default function CountriesMauritiusPage() { return <PublicLegacyPage slug="countriesmauritius" html={countriesMauritiusHtml} />; }
