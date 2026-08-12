import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { usmleRotationHtml } from "@/legacy/generated/usmlerotation";

export const metadata: Metadata = { title: "USA Clinical Rotations" };
export default function UsmleRotationPage() { return <PublicLegacyPage slug="usmlerotation" html={usmleRotationHtml} />; }
