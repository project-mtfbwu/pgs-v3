import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { error404Html } from "@/legacy/generated/error-404";

export const metadata: Metadata = { title: "Page Not Found" };
export default function Error404Page() { return <PublicLegacyPage slug="error-404" html={error404Html} />; }
