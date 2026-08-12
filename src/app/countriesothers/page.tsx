import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { countriesOthersHtml } from "@/legacy/generated/countriesothers";

export const metadata: Metadata = { title: "Study Abroad" };
export default function CountriesOthersPage() { return <PublicLegacyPage slug="countriesothers" html={countriesOthersHtml} />; }
