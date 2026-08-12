import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { financeHtml } from "@/legacy/generated/finance";

export const metadata: Metadata = { title: "Study Abroad Finance" };
export default function FinancePage() { return <PublicLegacyPage slug="finance" html={financeHtml} />; }
