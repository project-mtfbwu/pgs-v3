import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { exploreCountriesHtml } from "@/legacy/generated/explorecountries";

export const metadata: Metadata = { title: "Explore Countries" };
export default function ExploreCountriesPage() { return <PublicLegacyPage slug="explorecountries" html={exploreCountriesHtml} />; }
