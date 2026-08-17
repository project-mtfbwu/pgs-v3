export type AdminRelation = "countries" | "universities" | "course_categories" | "event_categories" | "events";

export type AdminField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "date" | "datetime" | "url" | "select";
  required?: boolean;
  options?: readonly string[];
  max?: number;
  relation?: AdminRelation;
  media?: boolean;
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
const number = (key: string, label: string, relation?: AdminRelation): AdminField => ({ key,label,type:"number",relation });
const media = (key: string, label: string): AdminField => ({ key,label,type:"text",media:true });
const published: AdminField = { key:"published",label:"Published",type:"boolean" };
const order: AdminField = { key:"display_order",label:"Display order",type:"number" };

export const catalogEntities: Record<string, AdminEntity> = {
  countries: { key:"countries",label:"Countries",table:"countries",idKey:"id",permissionDomain:"catalog",description:"Country lookup/reference data. Editorial country pages stay on CMS page slots.",fields:[text("name","Name",true),text("slug","Slug",true),text("iso_code","ISO code"),text("dial_code","Dial code"),published,order] },
  universities: { key:"universities",label:"Universities",table:"universities",idKey:"id",permissionDomain:"catalog",description:"Canonical university catalog. Student shortlists stay on student_university_selections.",fields:[number("country_id","Country","countries"),text("name","Name",true),text("slug","Slug",true),text("location","Location"),area("summary","Summary",4000),media("image_asset_id","Logo / image"),published] },
  programs: { key:"programs",label:"Programs",table:"programs",idKey:"id",permissionDomain:"catalog",description:"CV-ready programs. Featured maps to Most Wanted.",fields:[number("university_id","University","universities"),text("title","Title",true),text("slug","Slug",true),area("short_description","Short description",2000),area("description","Description"),media("image_asset_id","Image"),media("brochure_asset_id","Brochure"),text("top_label","Top label"),text("badge_text","Badge"),{key:"learn_more_url",label:"Learn more URL",type:"url",max:1000},text("close_date_text","Close date text"),area("who_is_it_for","Who it is for"),area("session_topics","Session topics"),text("highlight_1","Highlight 1",false,500),text("highlight_2","Highlight 2",false,500),text("highlight_3","Highlight 3",false,500),text("highlight_4","Highlight 4",false,500),published,{key:"featured",label:"Most wanted / featured",type:"boolean"},order] },
  course_categories: { key:"course_categories",label:"Course Categories",table:"course_categories",idKey:"id",permissionDomain:"catalog",description:"Reusable course classifications.",fields:[text("name","Name",true),text("slug","Slug",true),published,order] },
  courses: { key:"courses",label:"Courses",table:"courses",idKey:"id",permissionDomain:"catalog",description:"Courses. Featured maps to Top Picks / Most Wanted Course.",fields:[number("category_id","Category","course_categories"),number("university_id","University","universities"),text("title","Title",true),text("slug","Slug",true),area("short_description","Short description",2000),area("description","Description"),media("image_asset_id","Image"),media("brochure_asset_id","File / brochure"),{key:"starts_on",label:"Start date",type:"date"},{key:"ends_on",label:"End date",type:"date"},text("duration","Duration"),text("mode","Mode"),published,{key:"featured",label:"Top pick / featured",type:"boolean"},order] },
  event_categories: { key:"event_categories",label:"Event Categories",table:"event_categories",idKey:"id",permissionDomain:"catalog",description:"Event and webinar classifications.",fields:[text("name","Name",true),text("slug","Slug",true),published] },
  events: { key:"events",label:"Events / Webinars",table:"events",idKey:"id",permissionDomain:"catalog",description:"Sessions and webinars. Public meetup cards use published events.",fields:[number("category_id","Category","event_categories"),text("title","Title",true),text("slug","Slug",true),area("summary","Summary",3000),area("description","Description"),{key:"starts_at",label:"Starts at",type:"datetime"},{key:"ends_at",label:"Ends at",type:"datetime"},{key:"booking_url",label:"Booking URL",type:"url",max:1000},text("host","Host"),text("top_label","Top label"),text("badge","Badge"),text("location_note","Location"),text("mode","Mode"),area("who_is_it_for","Who it is for"),area("session_topics","Session topics"),area("what_we_cover","What we cover"),media("image_asset_id","Image"),published,order] },
  facilitators: { key:"facilitators",label:"Facilitators",table:"event_facilitators",idKey:"id",permissionDomain:"catalog",description:"Facilitators attached to events. Editing a published event requires catalog.publish.",fields:[number("event_id","Event","events"),text("name","Name",true),text("role","Role"),area("biography","Biography",6000),media("image_asset_id","Image"),order] },
  tags: { key:"tags",label:"Tags",table:"catalog_tags",idKey:"id",permissionDomain:"catalog",description:"One reusable tag vocabulary for programs, courses, events, and universities.",fields:[text("name","Name",true),text("slug","Slug",true),text("tag_type","Tag type",true),published] },
  facets: { key:"facets",label:"Filter Facets",table:"catalog_filter_facets",idKey:"id",permissionDomain:"catalog",description:"Extensible filters for programs, courses, events, and universities.",fields:[{key:"entity_type",label:"Entity",type:"select",required:true,options:["program","course","event","university"]},text("name","Name",true),text("slug","Slug",true),order] },
  filter_options: { key:"filter_options",label:"Filter Options",table:"catalog_filter_options",idKey:"id",permissionDomain:"catalog",description:"Options belonging to reusable catalog facets.",fields:[number("facet_id","Facet ID"),text("label","Label",true),text("value","Value",true),order] }
};

export const contentEntities: Record<string, AdminEntity> = {
  article_categories: { key:"article_categories",label:"Article Categories",table:"article_categories",idKey:"id",permissionDomain:"content",description:"Publication-aware categories shared by editorial articles.",fields:[text("name","Name",true),text("slug","Slug",true),published,order] },
  articles: { key:"articles",label:"Articles",table:"articles",idKey:"id",permissionDomain:"content",description:"Editorial articles with approved layouts and category relationships.",fields:[number("category_id","Category ID"),text("title","Title",true),text("slug","Slug",true),area("summary","Summary",3000),area("body","Body",100000),{key:"layout_key",label:"Layout",type:"select",options:["standard","feature","guide"]},media("image_asset_id","Image"),{key:"featured",label:"Show as featured",type:"boolean"},published,order] },
  highlights: { key:"highlights",label:"Highlights",table:"highlights",idKey:"id",permissionDomain:"content",description:"Reusable published highlight cards.",fields:[text("title","Title",true),area("body","Body",6000),media("image_asset_id","Image"),published,order] },
  faqs: { key:"faqs",label:"FAQs",table:"faqs",idKey:"id",permissionDomain:"content",description:"Scoped frequently asked questions.",fields:[text("scope","Scope",true),area("question","Question",2000),area("answer","Answer",12000),published,order] },
  testimonials: { key:"testimonials",label:"Testimonials",table:"testimonials",idKey:"id",permissionDomain:"content",description:"Reusable student and partner testimonials.",fields:[text("name","Name",true),text("role_label","Role / context"),area("quote","Quote",4000),media("image_asset_id","Image"),published,order] },
  weekly_wall: { key:"weekly_wall",label:"Weekly Wall",table:"weekly_wall_items",idKey:"id",permissionDomain:"content",description:"Purple Board weekly notices.",fields:[text("title","Title",true),area("body","Body",12000),published,order] },
  key_dates: { key:"key_dates",label:"Key Dates",table:"key_dates",idKey:"id",permissionDomain:"content",description:"Student-resource calendar dates.",fields:[text("title","Title",true),{key:"date_value",label:"Date",type:"date"},text("month_label","Month label"),published,order] },
  deadlines: { key:"deadlines",label:"Urgent Deadlines",table:"urgent_deadlines",idKey:"id",permissionDomain:"content",description:"Urgent deadline cards and destinations.",fields:[text("title","Title",true),{key:"deadline",label:"Deadline",type:"date"},{key:"url",label:"URL",type:"url",max:1000},published,order] },
  facts: { key:"facts",label:"Study Abroad Facts",table:"study_abroad_facts",idKey:"id",permissionDomain:"content",description:"Ordered student-resource facts.",fields:[area("fact","Fact",4000),published,order] },
  stats: { key:"stats",label:"PGS Stats",table:"pgs_stats",idKey:"id",permissionDomain:"content",description:"Categorized statistics and labels.",fields:[text("category","Category",true),text("label","Label",true),text("value","Value",true),published,order] },
  people: { key:"people",label:"Founder / Advisory",table:"content_people",idKey:"id",permissionDomain:"content",description:"Founder and advisory profiles.",fields:[{key:"person_type",label:"Type",type:"select",required:true,options:["founder","advisory"]},text("name","Name",true),text("title","Title"),area("biography","Biography"),media("image_asset_id","Image"),published,order] },
  notices: { key:"notices",label:"Notices / Marquee",table:"site_notices",idKey:"id",permissionDomain:"content",description:"Marquee, banner, and maintenance messages.",fields:[{key:"notice_type",label:"Type",type:"select",options:["marquee","banner","maintenance"]},area("text","Message",1000),{key:"link_url",label:"Link URL",type:"url",max:1000},{key:"active",label:"Active",type:"boolean"},{key:"starts_at",label:"Starts at",type:"datetime"},{key:"ends_at",label:"Ends at",type:"datetime"},order] },
  legal: { key:"legal",label:"Legal Content",table:"legal_documents",idKey:"id",permissionDomain:"content",description:"Privacy, terms, and refund content.",fields:[{key:"document_type",label:"Document",type:"select",required:true,options:["privacy","terms","refund"]},text("title","Title",true),area("body","Body",100000),{key:"status",label:"Status",type:"select",options:["draft","published","unpublished"]},number("version","Version")] },
  social: { key:"social",label:"Social Links",table:"site_social_links",idKey:"id",permissionDomain:"content",description:"Published footer and contact social destinations.",fields:[text("platform","Platform",true),{key:"url",label:"URL",type:"url",required:true,max:1000},published,order] },
  meeting_slots: { key:"meeting_slots",label:"University Meeting Slots",table:"university_meeting_slots",idKey:"id",permissionDomain:"content",description:"Sidebar meeting slots and optional course relationship.",fields:[text("label","Label",true),{key:"starts_at",label:"Starts at",type:"datetime"},number("course_id","Course ID"),{key:"booking_url",label:"Booking URL",type:"url",max:1000},published,order] },
  premium_settings: { key:"premium_settings",label:"Premium Video / Meetup",table:"premium_content_settings",idKey:"key",permissionDomain:"content",description:"Premium overview video only. Meetup is not a public content source; published events remain meetup cards.",fields:[{key:"key",label:"Type",type:"select",required:true,options:["video","meetup"]},text("title","Title"),area("body","Body",4000),media("media_asset_id","Media"),{key:"link_url",label:"URL",type:"url",max:1000},published] }
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
