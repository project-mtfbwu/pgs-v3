import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { eventSessionHtml } from "@/legacy/generated/event-session";

export const metadata: Metadata = { title: "Purple Event Session" };
export default async function PurpleEventSessionPage({params}:{params:Promise<{id:string}>}) { const {id}=await params; return <PublicLegacyPage slug="purpleevents-session" html={eventSessionHtml} eventId={Number(id)} />; }
