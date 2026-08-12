import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { cvReadyProgramHtml } from "@/legacy/generated/cvreadyprogram";

export const metadata: Metadata = { title: "CV-Ready Programs" };
export default function CvReadyProgramPage() { return <PublicLegacyPage slug="cvreadyprogram" html={cvReadyProgramHtml} />; }
