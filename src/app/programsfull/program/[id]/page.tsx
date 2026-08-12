import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { programDetailHtml } from "@/legacy/generated/program-detail";

export const metadata: Metadata = { title: "Program Details" };
export default function ProgramDetailPage() { return <PublicLegacyPage slug="program-detail" html={programDetailHtml} />; }
