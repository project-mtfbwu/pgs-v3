import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { eventSessionHtml } from "@/legacy/generated/event-session";

export const metadata: Metadata = { title: "Purple Event Session" };
export default function PurpleEventSessionPage() { return <PublicLegacyPage slug="purpleevents-session" html={eventSessionHtml} />; }
