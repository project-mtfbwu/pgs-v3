import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { purplePlabHtml } from "@/legacy/generated/purpleplab";

export const metadata: Metadata = { title: "PLAB Pathway" };
export default function PurplePlabPage() { return <PublicLegacyPage slug="purpleplab" html={purplePlabHtml} />; }
