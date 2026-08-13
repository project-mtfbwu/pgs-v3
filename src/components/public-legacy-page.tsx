import { LegacyPage } from "@/components/legacy-page";
import { applyPublicContent, getPublicContent, type PublicContentSlug } from "@/lib/public-content";
import { applyPremiumBusinessRule } from "@/lib/premium-business-rule";
import { getAuthenticatedUser } from "@/lib/auth";
import { applyAuthenticatedShell } from "@/lib/account-shell";
import { displayName, getOwnProfile } from "@/lib/student-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props<TSlug extends PublicContentSlug> = {
  slug: TSlug;
  html: string;
};

export async function PublicLegacyPage<TSlug extends PublicContentSlug>({ slug, html }: Props<TSlug>) {
  const content = await getPublicContent(slug);
  let rendered = applyPremiumBusinessRule(applyPublicContent(slug, html, content));
  const user = await getAuthenticatedUser();
  if (user) {
    const profile = await getOwnProfile(user);
    const supabase = await createSupabaseServerClient();
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    rendered = applyAuthenticatedShell(rendered, { name: displayName(profile, user), unreadCount: count ?? 0 });
  }
  return <LegacyPage page={slug} html={rendered} />;
}
