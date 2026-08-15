import type { Metadata } from "next";
import { OperationsLogin } from "@/components/operations-login";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { loginHtml } from "@/legacy/generated/login";
import { getAuthenticatedUser, safeNext } from "@/lib/auth";
import { withLoginError } from "@/lib/login-ui";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Login" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string; error?: string; surface?: string }> }) {
  const params = await searchParams;
  const user = await getAuthenticatedUser();
  if (user) redirect(safeNext(params.redirect));
  if (params.surface === "operations") {
    return <OperationsLogin redirectPath={safeNext(params.redirect, "/admin")} />;
  }
  return <PublicLegacyPage slug="login" html={withLoginError(loginHtml, params.error)} />;
}
