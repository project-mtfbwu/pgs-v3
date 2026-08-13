import { describe,expect,it } from "vitest";
import { catalogEntities,contentEntities,sanitizeAdminValues } from "@/lib/admin-registry";
import { sanitizeCmsContent,cmsContentDefaults } from "@/lib/cms-schema";

describe("Batch 4 allow-listed operations",()=>{
  it("covers the required relational catalog and active content modules",()=>{expect(Object.keys(catalogEntities)).toEqual(expect.arrayContaining(["universities","programs","courses","events","facilitators","tags","facets","filter_options"]));expect(Object.keys(contentEntities)).toEqual(expect.arrayContaining(["articles","faqs","testimonials","weekly_wall","key_dates","deadlines","facts","stats","people","notices","legal","social","premium_settings"]));});
  it("rejects unapproved fields and unsafe URLs",()=>{const entity=catalogEntities.events;expect(()=>sanitizeAdminValues(entity,{title:"Event",slug:"event",booking_url:"javascript:alert(1)"})).toThrow(/safe URL/);expect(sanitizeAdminValues(entity,{title:"Event",slug:"event",unexpected:"ignored"})).not.toHaveProperty("unexpected");});
  it("accepts only known CMS slots",()=>{const defaults=cmsContentDefaults.about;expect(()=>sanitizeCmsContent("about",{heroHeading:"Only one field"})).toThrow();const result=sanitizeCmsContent("about",defaults);expect(Object.keys(result)).toEqual(Object.keys(defaults));expect(()=>sanitizeCmsContent("missing",{})).toThrow(/approved CMS schema/);});
});
