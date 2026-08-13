import {describe,expect,it} from "vitest";
import {applyPublishedCatalogCards,applyPublishedCatalogDetail,applyPublishedEventDetail,applyPublishedEvents} from "@/lib/public-catalog";

describe("published relational catalog parity",()=>{
  it("replaces only the traced empty program container and preserves escaped content",()=>{
    const html='<div class="d-flex wrap align-items-start gap-3 mt-3 justify-content-center"><p class="text-muted">No programs yet. Check back later.</p></div><footer>kept</footer>';
    const result=applyPublishedCatalogCards(html,"programs",[{id:12,title:'Safe <Program>',summary:'A & B',saved:true}]);
    expect(result).toContain('data-program-id="12"');expect(result).toContain("Safe &lt;Program&gt;");expect(result).toContain("A &amp; B");expect(result).toContain("is-saved");expect(result).toContain("<footer>kept</footer>");
  });
  it("binds published courses to the retained Purple Board container",()=>{
    const html='<div class="row align-items-start justify-content-md-start mobile-row-0" id="purpleboardCourses"><div class="col-12 text-center py-5"><p class="text-muted mb-0">No courses available yet. Courses added in admin will appear here.</p></div></div>';
    const result=applyPublishedCatalogCards(html,"courses",[{id:7,title:"Course",summary:"Summary",saved:false}]);
    expect(result).toContain('data-relational-catalog="courses"');expect(result).toContain('/programsfull/program/7?type=course');expect(result).toContain('class="save-course"');
  });
  it("hydrates the retained program-detail slots and save control",()=>{
    const html='<div class="sop-image-wrapper-1 w-100"><h1>Program details</h1><div class="mt-2 mobile-w-70 mobile-m-auto mobile-pb-4 mobile-pt-2"><span class="copy"></span></div><div class="sop-heart-icon bg-purple text-white px-1 fs-16 border-radius-6px"></div>';
    const result=applyPublishedCatalogDetail(html,{kind:"courses",id:9,title:"Live course",summary:"Published summary",description:"",saved:true});
    expect(result).toContain('data-course-id="9"');expect(result).toContain("Live course");expect(result).toContain("Published summary");expect(result).toContain("save-course is-saved");
  });
  it("adds relational events to both retained Upcoming Sessions renderers",()=>{
    const html='<span class="mobile-fs-24">Upcoming Sessions</span></h1></div><div class="overflow-hidden border-radius-16px w-383px">old</div><h1 class="fnt-family fs-50 mb-0 text-black">Upcoming Sessions</h1></div></div><div class="row align-items-center">old desktop</div>';
    const result=applyPublishedEvents(html,[{id:7,title:"Safe & useful",summary:"Live session",description:"",startsAt:"2026-08-13T10:00:00Z",endsAt:null,bookingUrl:null}]);
    expect(result.match(/data-relational-events/g)).toHaveLength(2);expect(result).toContain("Safe &amp; useful");expect(result).toContain('/purpleevents/session/7');
  });
  it("hydrates a retained event detail from the published event record",()=>{
    const html='<div class="w-70"><h1 class="hero">Old event</h1></div><button type="button" class="sop-learn-btn bg-blue-500 mt-2 fs-17 w-100 fw-600 text-black border-radius-4px py-2 ht-48">Book Your Seat</button>';
    const result=applyPublishedEventDetail(html,{id:9,title:"New <Event>",summary:"",description:"",startsAt:null,endsAt:null,bookingUrl:"https://example.com/book"});
    expect(result).toContain("New &lt;Event&gt;");expect(result).toContain('href="https://example.com/book"');
  });
});
