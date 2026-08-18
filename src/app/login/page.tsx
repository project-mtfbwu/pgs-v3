import { OperationsLogin } from "@/components/operations-login";
import { PublicLegacyPage } from "@/components/public-legacy-page";
import { loginHtml } from "@/legacy/generated/login";
import { getAuthenticatedUser, safeNext } from "@/lib/auth";
import { withLoginError } from "@/lib/login-ui";
import { redirect } from "next/navigation";
import { cmsMetadata } from "@/lib/cms-metadata";

export async function generateMetadata() { return cmsMetadata('login'); }
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string; error?: string; surface?: string }> }) {
  const params = await searchParams;
  const user = await getAuthenticatedUser();
  if (user) redirect(safeNext(params.redirect));
  if (params.surface === "operations") {
    return <OperationsLogin redirectPath={safeNext(params.redirect, "/admin")} />;
  }
  if (params.surface === "guardian") {
    // Guardian portal sign-in uses the same operations login component with guardian framing.
    return <OperationsLogin redirectPath={safeNext(params.redirect, "/portal")} guardianSurface />;
  }
  return <PublicLegacyPage slug="login" html={withLoginError(loginHtml, params.error)} />;
}
