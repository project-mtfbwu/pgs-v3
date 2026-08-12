import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { uniTieUpHtml } from "@/legacy/generated/unitieup";

export const metadata: Metadata = { title: "University Partnerships" };
export default function UniversityTieUpPage() { return <PublicLegacyPage slug="unitieup" html={uniTieUpHtml} />; }
