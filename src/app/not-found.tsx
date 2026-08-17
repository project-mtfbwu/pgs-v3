import { PublicLegacyPage } from "@/components/public-legacy-page";
import { error404Html } from "@/legacy/generated/error-404";

export default function NotFoundPage() {
  return <PublicLegacyPage slug="error-404" html={error404Html} authenticatedActorFallback />;
}
