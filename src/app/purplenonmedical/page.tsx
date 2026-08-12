import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { purpleNonMedicalHtml } from "@/legacy/generated/purplenonmedical";

export const metadata: Metadata = { title: "Non-Medical Pathway" };
export default function PurpleNonMedicalPage() { return <PublicLegacyPage slug="purplenonmedical" html={purpleNonMedicalHtml} />; }
