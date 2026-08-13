import type { Metadata } from "next";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { loginHtml } from "@/legacy/generated/login";
import { getAuthenticatedUser, safeNext } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Login" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const user = await getAuthenticatedUser();
  if (user) redirect(safeNext((await searchParams).redirect));
  return <PublicLegacyPage slug="login" html={loginHtml} />;
}
