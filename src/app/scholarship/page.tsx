import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { scholarshipHtml } from "@/legacy/generated/scholarship";

export const metadata: Metadata = { title: "Scholarship Guide" };
export default function ScholarshipPage() { return <PublicLegacyPage slug="scholarship" html={scholarshipHtml} />; }
