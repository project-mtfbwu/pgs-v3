import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { studentResourcesHtml } from "@/legacy/generated/studentresources";

export const metadata: Metadata = { title: "Student Resources" };
export default function StudentResourcesPage() { return <PublicLegacyPage slug="studentresources" html={studentResourcesHtml} />; }
