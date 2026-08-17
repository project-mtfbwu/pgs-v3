import { PublicLegacyPage } from "@/components/public-legacy-page";
import { eventSessionHtml } from "@/legacy/generated/event-session";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata("purpleevents-session"); }
export default async function PurpleEventSessionPage({params}:{params:Promise<{id:string}>}) { const {id}=await params; return <PublicLegacyPage slug="purpleevents-session" html={eventSessionHtml} eventId={Number(id)} />; }
