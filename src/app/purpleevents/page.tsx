import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { purpleEventsHtml } from "@/legacy/generated/purpleevents";

export const metadata: Metadata = { title: "Purple Events" };
export default function PurpleEventsPage() { return <PublicLegacyPage slug="purpleevents" html={purpleEventsHtml} />; }
