export type AdminField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "date" | "datetime" | "url" | "select";
  required?: boolean;
  options?: readonly string[];
  max?: number;
};

export type AdminEntity = {
  key: string;
  label: string;
  table: string;
  idKey: string;
  fields: readonly AdminField[];
  permissionDomain: "catalog" | "content";
  description: string;
};

const text = (key: string, label: string, required = false, max = 255): AdminField => ({ key,label,type:"text",required,max });
const area = (key: string, label: string, max = 12000): AdminField => ({ key,label,type:"textarea",max });
const number = (key: string, label: string): AdminField => ({ key,label,type:"number" });
const published: AdminField = { key:"published",label:"Published",type:"boolean" };
const order: AdminField = { key:"display_order",label:"Display order",type:"number" };

export const catalogEntities: Record<string, AdminEntity> = {
  countries: { key:"countries",label:"Countries",table:"countries",idKey:"id",permissionDomain:"catalog",description:"Country, ISO, dial-code, publication, and ordering data.",fields:[text("name","Name",true),text("slug","Slug",true),text("iso_code","ISO code"),text("dial_code","Dial code"),published,order] },
  universities: { key:"universities",label:"Universities",table:"universities",idKey:"id",permissionDomain:"catalog",description:"University master records and country relationships.",fields:[number("country_id","Country ID"),text("name","Name",true),text("slug","Slug",true),area("summary","Summary",4000),text("image_asset_id","Media asset UUID"),published] },
  programs: { key:"programs",label:"Programs",table:"programs",idKey:"id",permissionDomain:"catalog",description:"CV-ready programs with university, media, and publication state.",fields:[number("university_id","University ID"),text("title","Title",true),text("slug","Slug",true),area("short_description","Short description",2000),area("description","Description"),text("image_asset_id","Image asset UUID"),text("brochure_asset_id","Brochure asset UUID"),published,{key:"featured",label:"Featured",type:"boolean"},order] },
  course_categories: { key:"course_categories",label:"Course Categories",table:"course_categories",idKey:"id",permissionDomain:"catalog",description:"Reusable course classifications.",fields:[text("name","Name",true),text("slug","Slug",true),published,order] },
  courses: { key:"courses",label:"Courses",table:"courses",idKey:"id",permissionDomain:"catalog",description:"Courses and their category/university relationships.",fields:[number("category_id","Category ID"),number("university_id","University ID"),text("title","Title",true),text("slug","Slug",true),area("short_description","Short description",2000),area("description","Description"),text("image_asset_id","Media asset UUID"),published,{key:"featured",label:"Top pick / featured",type:"boolean"}] },
  event_categories: { key:"event_categories",label:"Event Categories",table:"event_categories",idKey:"id",permissionDomain:"catalog",description:"Event and webinar classifications.",fields:[text("name","Name",true),text("slug","Slug",true),published] },
  events: { key:"events",label:"Events / Webinars",table:"events",idKey:"id",permissionDomain:"catalog",description:"Sessions, webinars, dates, booking, and publication.",fields:[number("category_id","Category ID"),text("title","Title",true),text("slug","Slug",true),area("summary","Summary",3000),area("description","Description"),{key:"starts_at",label:"Starts at",type:"datetime"},{key:"ends_at",label:"Ends at",type:"datetime"},{key:"booking_url",label:"Booking URL",type:"url",max:1000},text("image_asset_id","Media asset UUID"),published] },
  facilitators: { key:"facilitators",label:"Facilitators",table:"event_facilitators",idKey:"id",permissionDomain:"catalog",description:"Facilitators attached to events and webinars.",fields:[number("event_id","Event ID"),text("name","Name",true),text("role","Role"),area("biography","Biography",6000),text("image_asset_id","Media asset UUID"),order] },
  tags: { key:"tags",label:"Tags",table:"catalog_tags",idKey:"id",permissionDomain:"catalog",description:"One tag vocabulary shared by programs, courses, and events.",fields:[text("name","Name",true),text("slug","Slug",true),text("tag_type","Tag type",true),published] },
  facets: { key:"facets",label:"Filter Facets",table:"catalog_filter_facets",idKey:"id",permissionDomain:"catalog",description:"Extensible filters for programs, courses, events, and universities.",fields:[{key:"entity_type",label:"Entity",type:"select",required:true,options:["program","course","event","university"]},text("name","Name",true),text("slug","Slug",true),order] },
  filter_options: { key:"filter_options",label:"Filter Options",table:"catalog_filter_options",idKey:"id",permissionDomain:"catalog",description:"Options belonging to reusable catalog facets.",fields:[number("facet_id","Facet ID"),text("label","Label",true),text("value","Value",true),order] }
};

export const contentEntities: Record<string, AdminEntity> = {
  article_categories: { key:"article_categories",label:"Article Categories",table:"article_categories",idKey:"id",permissionDomain:"content",description:"Publication-aware categories shared by editorial articles.",fields:[text("name","Name",true),text("slug","Slug",true),published,order] },
  articles: { key:"articles",label:"Articles",table:"articles",idKey:"id",permissionDomain:"content",description:"Editorial articles with approved layouts and category relationships.",fields:[number("category_id","Category ID"),text("title","Title",true),text("slug","Slug",true),area("summary","Summary",3000),area("body","Body",100000),{key:"layout_key",label:"Layout",type:"select",options:["standard","feature","guide"]},text("image_asset_id","Media asset UUID"),{key:"featured",label:"Show as featured",type:"boolean"},published,order] },
  highlights: { key:"highlights",label:"Highlights",table:"highlights",idKey:"id",permissionDomain:"content",description:"Reusable published highlight cards.",fields:[text("title","Title",true),area("body","Body",6000),text("image_asset_id","Media asset UUID"),published,order] },
  faqs: { key:"faqs",label:"FAQs",table:"faqs",idKey:"id",permissionDomain:"content",description:"Scoped frequently asked questions.",fields:[text("scope","Scope",true),area("question","Question",2000),area("answer","Answer",12000),published,order] },
  testimonials: { key:"testimonials",label:"Testimonials",table:"testimonials",idKey:"id",permissionDomain:"content",description:"Reusable student and partner testimonials.",fields:[text("name","Name",true),text("role_label","Role / context"),area("quote","Quote",4000),text("image_asset_id","Media asset UUID"),published,order] },
  weekly_wall: { key:"weekly_wall",label:"Weekly Wall",table:"weekly_wall_items",idKey:"id",permissionDomain:"content",description:"Purple Board weekly notices.",fields:[text("title","Title",true),area("body","Body",12000),published,order] },
  key_dates: { key:"key_dates",label:"Key Dates",table:"key_dates",idKey:"id",permissionDomain:"content",description:"Student-resource calendar dates.",fields:[text("title","Title",true),{key:"date_value",label:"Date",type:"date"},text("month_label","Month label"),published,order] },
  deadlines: { key:"deadlines",label:"Urgent Deadlines",table:"urgent_deadlines",idKey:"id",permissionDomain:"content",description:"Urgent deadline cards and destinations.",fields:[text("title","Title",true),{key:"deadline",label:"Deadline",type:"date"},{key:"url",label:"URL",type:"url",max:1000},published,order] },
  facts: { key:"facts",label:"Study Abroad Facts",table:"study_abroad_facts",idKey:"id",permissionDomain:"content",description:"Ordered student-resource facts.",fields:[area("fact","Fact",4000),published,order] },
  stats: { key:"stats",label:"PGS Stats",table:"pgs_stats",idKey:"id",permissionDomain:"content",description:"Categorized statistics and labels.",fields:[text("category","Category",true),text("label","Label",true),text("value","Value",true),published,order] },
  people: { key:"people",label:"Founder / Advisory",table:"content_people",idKey:"id",permissionDomain:"content",description:"Founder and advisory profiles.",fields:[{key:"person_type",label:"Type",type:"select",required:true,options:["founder","advisory"]},text("name","Name",true),text("title","Title"),area("biography","Biography"),text("image_asset_id","Media asset UUID"),published,order] },
  notices: { key:"notices",label:"Notices / Marquee",table:"site_notices",idKey:"id",permissionDomain:"content",description:"Marquee, banner, and maintenance messages.",fields:[{key:"notice_type",label:"Type",type:"select",options:["marquee","banner","maintenance"]},area("text","Message",1000),{key:"link_url",label:"Link URL",type:"url",max:1000},{key:"active",label:"Active",type:"boolean"},{key:"starts_at",label:"Starts at",type:"datetime"},{key:"ends_at",label:"Ends at",type:"datetime"},order] },
  legal: { key:"legal",label:"Legal Content",table:"legal_documents",idKey:"id",permissionDomain:"content",description:"Privacy, terms, and refund content.",fields:[{key:"document_type",label:"Document",type:"select",required:true,options:["privacy","terms","refund"]},text("title","Title",true),area("body","Body",100000),{key:"status",label:"Status",type:"select",options:["draft","published","unpublished"]},number("version","Version")] },
  social: { key:"social",label:"Social Links",table:"site_social_links",idKey:"id",permissionDomain:"content",description:"Published footer and contact social destinations.",fields:[text("platform","Platform",true),{key:"url",label:"URL",type:"url",required:true,max:1000},published,order] },
  meeting_slots: { key:"meeting_slots",label:"University Meeting Slots",table:"university_meeting_slots",idKey:"id",permissionDomain:"content",description:"Sidebar meeting slots and optional course relationship.",fields:[text("label","Label",true),{key:"starts_at",label:"Starts at",type:"datetime"},number("course_id","Course ID"),{key:"booking_url",label:"Booking URL",type:"url",max:1000},published,order] },
  premium_settings: { key:"premium_settings",label:"Premium Video / Meetup",table:"premium_content_settings",idKey:"key",permissionDomain:"content",description:"Premium marketing video and meetup cards; not an application workflow.",fields:[{key:"key",label:"Type",type:"select",required:true,options:["video","meetup"]},text("title","Title"),area("body","Body",4000),text("media_asset_id","Media asset UUID"),{key:"link_url",label:"URL",type:"url",max:1000},published] }
};

export function getAdminEntity(domain: "catalog" | "content", key: string): AdminEntity | null {
  return (domain === "catalog" ? catalogEntities : contentEntities)[key] ?? null;
}

export function sanitizeAdminValues(entity: AdminEntity, input: Record<string, unknown>, partial = false): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of entity.fields) {
    if (!(field.key in input)) { if (field.required && !partial) throw new Error(`${field.label} is required.`); continue; }
    const raw = input[field.key];
    if (field.type === "boolean") {
      if(typeof raw!=="boolean")throw new Error(`${field.label} must be true or false.`);
      values[field.key]=raw;
    }
    else if (field.type === "number") {
      if(raw===""||raw==null){values[field.key]=null;continue;}
      const numeric=Number(raw);
      if(!Number.isSafeInteger(numeric)||numeric<0)throw new Error(`${field.label} must be a non-negative whole number.`);
      values[field.key]=numeric;
    }
    else {
      const value = typeof raw === "string" ? raw.trim() : "";
      if (field.required && !value) throw new Error(`${field.label} is required.`);
      if (field.max && value.length > field.max) throw new Error(`${field.label} is too long.`);
      if (field.options && value && !field.options.includes(value)) throw new Error(`${field.label} is invalid.`);
      if (field.type === "url" && value && !/^https?:\/\//i.test(value) && !value.startsWith("/")) throw new Error(`${field.label} must be a safe URL.`);
      if(field.type==="url"&&value.startsWith("//"))throw new Error(`${field.label} must be a safe URL.`);
      if(field.key==="slug"&&value&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))throw new Error(`${field.label} must use lowercase letters, numbers, and hyphens.`);
      if(field.key.endsWith("_asset_id")&&value&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))throw new Error(`${field.label} must be a valid media asset ID.`);
      if((field.type==="date"||field.type==="datetime")&&value&&Number.isNaN(Date.parse(value)))throw new Error(`${field.label} must be a valid date.`);
      values[field.key] = value || null;
    }
  }
  return values;
}
