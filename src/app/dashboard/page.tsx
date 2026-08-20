import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Student Dashboard" };
export const dynamic = "force-dynamic";

export default function DashboardCompatibilityPage() {
  redirect("/student/dashboard");
}
