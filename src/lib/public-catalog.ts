import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PublicCatalogCard={id:number;title:string;summary:string;saved:boolean};
export type PublicCatalogDetail=PublicCatalogCard&{description:string;kind:"programs"|"courses"};
export type PublicEvent={id:number;title:string;summary:string;description:string;startsAt:string|null;endsAt:string|null;bookingUrl:string|null};

function escapeHtml(value:string):string{return value.replace(/[&<>'"]/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[character]??character);}

async function savedLookupClient(privileged?:boolean){
  return privileged?createSupabaseAdminClient():await createSupabaseServerClient();
}

export async function getPublicCatalogCards(kind:"programs"|"courses",studentId?:string,options?:{privileged?:boolean}):Promise<PublicCatalogCard[]>{
  const config=getSupabasePublicConfig();
  if(!config)return [];
  const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.from(kind).select("id,title,short_description").eq("published",true).order(kind==="programs"?"display_order":"title").limit(60);
  if(error||!data?.length)return [];
  let savedIds=new Set<number>();
  if(studentId){
    const server=await savedLookupClient(options?.privileged);
    const savedTable=kind==="programs"?"saved_programs":"saved_courses";
    const idColumn=kind==="programs"?"program_id":"course_id";
    const saved=await server.from(savedTable).select(idColumn).eq("student_id",studentId);
    if(!saved.error)savedIds=new Set((saved.data??[]).map((row)=>Number(kind==="programs"?(row as {program_id:unknown}).program_id:(row as {course_id:unknown}).course_id)));
  }
  return data.map((row)=>({id:Number(row.id),title:String(row.title),summary:typeof row.short_description==="string"?row.short_description:"",saved:savedIds.has(Number(row.id))}));
}

export async function getPublicCatalogDetail(kind:"programs"|"courses",id:number,studentId?:string,options?:{privileged?:boolean}):Promise<PublicCatalogDetail|null>{
  const config=getSupabasePublicConfig();if(!config)return null;
  const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.from(kind).select("id,title,short_description,description").eq("id",id).eq("published",true).maybeSingle();
  if(error||!data)return null;
  let saved=false;
  if(studentId){const server=await savedLookupClient(options?.privileged);const table=kind==="programs"?"saved_programs":"saved_courses";const column=kind==="programs"?"program_id":"course_id";const result=await server.from(table).select(column,{count:"exact",head:true}).eq("student_id",studentId).eq(column,id);saved=!result.error&&Boolean(result.count);}
  return {kind,id:Number(data.id),title:String(data.title),summary:typeof data.short_description==="string"?data.short_description:"",description:typeof data.description==="string"?data.description:"",saved};
}

export async function getPublicEvents():Promise<PublicEvent[]>{
  const config=getSupabasePublicConfig();if(!config)return [];
  const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.from("events").select("id,title,summary,description,starts_at,ends_at,booking_url").eq("published",true).order("starts_at").limit(60);
  if(error)return [];
  return (data??[]).map((row)=>({id:Number(row.id),title:String(row.title),summary:typeof row.summary==="string"?row.summary:"",description:typeof row.description==="string"?row.description:"",startsAt:typeof row.starts_at==="string"?row.starts_at:null,endsAt:typeof row.ends_at==="string"?row.ends_at:null,bookingUrl:typeof row.booking_url==="string"?row.booking_url:null}));
}

export async function getPublicEvent(id:number):Promise<PublicEvent|null>{
  if(!Number.isSafeInteger(id)||id<=0)return null;
  const config=getSupabasePublicConfig();if(!config)return null;
  const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.from("events").select("id,title,summary,description,starts_at,ends_at,booking_url").eq("id",id).eq("published",true).maybeSingle();
  if(error||!data)return null;
  return {id:Number(data.id),title:String(data.title),summary:typeof data.summary==="string"?data.summary:"",description:typeof data.description==="string"?data.description:"",startsAt:typeof data.starts_at==="string"?data.starts_at:null,endsAt:typeof data.ends_at==="string"?data.ends_at:null,bookingUrl:typeof data.booking_url==="string"?data.booking_url:null};
}

function cardsHtml(kind:"programs"|"courses",cards:PublicCatalogCard[]):string{
  const singular=kind==="programs"?"program":"course";
  return cards.map((card)=>`<article class="col-lg-4 col-md-6 col-12 pgs-relational-catalog-card" data-${singular}-id="${card.id}"><div class="card-line h-100"><a href="/programsfull/program/${card.id}${kind==="courses"?"?type=course":""}" class="text-black text-decoration-none"><h3 class="fnt-family fs-28">${escapeHtml(card.title)}</h3><p>${escapeHtml(card.summary)}</p></a><button type="button" class="save-${singular}${card.saved?" is-saved":""}" data-save-id="${card.id}" aria-label="${card.saved?"Remove from saved":"Save"}">${card.saved?"♥":"♡"}</button></div></article>`).join("");
}

export function applyPublishedCatalogCards(html:string,kind:"programs"|"courses",cards:PublicCatalogCard[]):string{
  if(!cards.length)return html;
  const rendered=cardsHtml(kind,cards);
  if(kind==="programs")return html.replace(/<div class="d-flex wrap align-items-start gap-3 mt-3 justify-content-center">\s*<p class="text-muted">No programs yet\. Check back later\.<\/p>\s*<\/div>/i,`<div class="d-flex wrap align-items-start gap-3 mt-3 justify-content-center" data-relational-catalog="programs">${rendered}</div>`);
  return html.replace(/<div class="row align-items-start justify-content-md-start mobile-row-0" id="purpleboardCourses">\s*<div class="col-12 text-center py-5">\s*<p class="text-muted mb-0">No courses available yet\. Courses added in admin will appear here\.<\/p>\s*<\/div>\s*<\/div>/i,`<div class="row align-items-start justify-content-md-start mobile-row-0" id="purpleboardCourses" data-relational-catalog="courses">${rendered}</div>`);
}

export function applyPublishedCatalogDetail(html:string,detail:PublicCatalogDetail):string{
  const singular=detail.kind==="programs"?"program":"course";
  return html
    .replace(/(<div class="sop-image-wrapper-1 w-100">)/i,`$1<div data-${singular}-id="${detail.id}" hidden></div>`)
    .replace(/>Program details<\/h1>/i,`>${escapeHtml(detail.title)}</h1>`)
    .replace(/(<div class="mt-2 mobile-w-70 mobile-m-auto mobile-pb-4 mobile-pt-2">\s*<span[^>]*>)\s*(<\/span>)/i,`$1${escapeHtml(detail.summary||detail.description)}$2`)
    .replace(/<div class="sop-heart-icon bg-purple text-white px-1 fs-16 border-radius-6px">\s*<\/div>/i,`<button type="button" class="sop-heart-icon bg-purple text-white px-1 fs-16 border-radius-6px save-${singular}${detail.saved?" is-saved":""}" data-save-id="${detail.id}" aria-label="${detail.saved?"Remove from saved":"Save"}">${detail.saved?"♥":"♡"}</button>`);
}

function eventDate(value:string|null):{day:string;month:string;time:string}{
  if(!value)return {day:"—",month:"Date TBC",time:""};
  const date=new Date(value);if(Number.isNaN(date.getTime()))return {day:"—",month:"Date TBC",time:""};
  return {day:new Intl.DateTimeFormat("en-GB",{day:"2-digit",timeZone:"UTC"}).format(date),month:new Intl.DateTimeFormat("en-GB",{month:"short",year:"2-digit",timeZone:"UTC"}).format(date),time:new Intl.DateTimeFormat("en-GB",{hour:"numeric",minute:"2-digit",timeZone:"UTC"}).format(date)};
}

function eventCardsHtml(events:PublicEvent[]):string{return `<div class="d-flex wrap gap-3 justify-content-center" data-relational-events>${events.map((event)=>{const start=eventDate(event.startsAt);const end=eventDate(event.endsAt);return `<article class="overflow-hidden border-radius-16px w-383px box-border-fix"><div class="card-box-gradiant border p-4"><div class="card-box-gradiant-header purple-dot"><h5 class="mb-0">${escapeHtml(event.title)}</h5></div><div class="date-box"><div><div class="box-date-info"><span class="date">${start.day}</span><span class="month">${start.month}</span></div><p class="mb-0 text-black fw-600 fs-12 lh-16 mt-2">${start.time}</p></div>${event.endsAt?`<div><div class="box-date-info"><span class="date">${end.day}</span><span class="month">${end.month}</span></div><p class="mb-0 text-black fw-600 fs-12 lh-16 mt-2">${end.time}</p></div>`:""}</div><div class="btn-content"><p class="mb-0 fs-14 lh-18 text-black">${escapeHtml(event.summary)}</p></div><div class="d-flex justify-content-space"><a href="/purpleevents/session/${event.id}" class="sop-learn-btn bg-blue-500 mt-4 fs-12 ht-32 text-decoration-none text-black d-inline-flex align-items-center justify-content-center">Learn More</a></div></div></article>`;}).join("")}</div>`;}

export function applyPublishedEvents(html:string,events:PublicEvent[]):string{
  if(!events.length)return html;
  const cards=eventCardsHtml(events);
  return html
    .replace(/(<span class="mobile-fs-24">Upcoming Sessions<\/span>\s*<\/h1>\s*<\/div>)/i,`$1${cards}`)
    .replace(/(<h1 class="fnt-family fs-50 mb-0 text-black">Upcoming Sessions<\/h1>\s*<\/div>\s*<\/div>)/i,`$1${cards}`);
}

export function applyPublishedEventDetail(html:string,event:PublicEvent):string{
  const booking=event.bookingUrl&&/^https?:\/\//i.test(event.bookingUrl)?event.bookingUrl:"/contactus";
  return html
    .replace(/(<div class="w-70">\s*<h1[^>]*>)[\s\S]*?(<\/h1>)/i,`$1${escapeHtml(event.title)}$2`)
    .replace(/<button type="button" class="sop-learn-btn bg-blue-500 mt-2 fs-17 w-100 fw-600 text-black border-radius-4px py-2 ht-48">[\s\S]*?<\/button>/i,`<a href="${escapeHtml(booking)}" class="sop-learn-btn bg-blue-500 mt-2 fs-17 w-100 fw-600 text-black border-radius-4px py-2 ht-48 d-inline-flex align-items-center justify-content-center">Book Your Seat</a>`);
}
