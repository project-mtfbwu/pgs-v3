import { LegacyPage } from "@/components/legacy-page";
import { applyPublicContent, getPublicContent, type PublicContentSlug } from "@/lib/public-content";
import { applyPremiumBusinessRule } from "@/lib/premium-business-rule";
import { applyAuthenticatedShell } from "@/lib/account-shell";
import { resolveStudentExperience } from "@/lib/student-experience";
import { applyPublishedCatalogCards, applyPublishedCatalogDetail, applyPublishedEventDetail, applyPublishedEvents, getPublicCatalogCards, getPublicCatalogDetail, getPublicEvent, getPublicEvents } from "@/lib/public-catalog";

type Props<TSlug extends PublicContentSlug> = {
  slug: TSlug;
  html: string;
  catalogDetail?:{kind:"programs"|"courses";id:number};
  eventId?:number;
};

export async function PublicLegacyPage<TSlug extends PublicContentSlug>({ slug, html, catalogDetail, eventId }: Props<TSlug>) {
  const content = await getPublicContent(slug);
  let rendered = applyPremiumBusinessRule(applyPublicContent(slug, html, content));
  const state = await resolveStudentExperience();
  if(slug==="cvreadyprogram"||slug==="purpleboard"){
    const kind=slug==="cvreadyprogram"?"programs":"courses";
    const cards=await getPublicCatalogCards(kind,state.kind==="anonymous"?undefined:state.user.id);
    rendered=applyPublishedCatalogCards(rendered,kind,cards);
  }
  if(catalogDetail){const detail=await getPublicCatalogDetail(catalogDetail.kind,catalogDetail.id,state.kind==="anonymous"?undefined:state.user.id);if(detail)rendered=applyPublishedCatalogDetail(rendered,detail);}
  if(slug==="purpleevents"){rendered=applyPublishedEvents(rendered,await getPublicEvents());}
  if(slug==="purpleevents-session"&&eventId){const event=await getPublicEvent(eventId);if(event)rendered=applyPublishedEventDetail(rendered,event);}
  if (state.kind!=="anonymous") {
    rendered = applyAuthenticatedShell(rendered, { name:state.name, unreadCount:state.unreadCount, premium:state.kind==="authenticated_premium" });
  }
  return <LegacyPage page={slug} html={rendered} studentState={state.kind} />;
}
