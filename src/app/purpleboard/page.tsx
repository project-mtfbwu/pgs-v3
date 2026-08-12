import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { purpleBoardHtml } from "@/legacy/generated/purpleboard";

export const metadata: Metadata = { title: "Purple Board" };
export default function PurpleBoardPage() { return <PublicLegacyPage slug="purpleboard" html={purpleBoardHtml} />; }
