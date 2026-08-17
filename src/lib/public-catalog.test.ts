import {describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/staff-preview-server",()=>({getActiveStudentPreviewTargetId:async()=>null}));
import {applyFeaturedCatalogCards,applyPublishedCatalogCards,applyPublishedCatalogDetail,applyPublishedEventDetail,applyPublishedEvents} from "@/lib/public-catalog";

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
  it("replaces static Upcoming Sessions cards instead of injecting beside them",()=>{
    const html='<section class="pt-3 mobile-event-program desktop-none"><div class="container"><div class="d-flex"><div class="w-30"><h1><span class="mobile-fs-24">Upcoming Sessions</span></h1></div><div class="overflow-hidden border-radius-16px w-383px">old static</div></div></div></section><div class="swiper-wrapper purple-teams" id="wrap"><div class="swiper-slide">old desktop</div></div><span class="swiper-notification"></span>';
    const result=applyPublishedEvents(html,[{id:7,title:"Safe & useful",summary:"Live session",description:"",startsAt:"2026-08-13T10:00:00Z",endsAt:null,bookingUrl:null}]);
    expect(result).toContain("Safe &amp; useful");
    expect(result).toContain('/purpleevents/session/7');
    expect(result).not.toContain("old static");
    expect(result).not.toContain("old desktop");
    expect(result).toContain("data-relational-events");
  });
  it("hydrates a retained event detail from the published event record",()=>{
    const html='<div class="w-70"><h1 class="hero">Old event</h1></div><button type="button" class="sop-learn-btn bg-blue-500 mt-2 fs-17 w-100 fw-600 text-black border-radius-4px py-2 ht-48">Book Your Seat</button>';
    const result=applyPublishedEventDetail(html,{id:9,title:"New <Event>",summary:"",description:"",startsAt:null,endsAt:null,bookingUrl:"https://example.com/book"});
    expect(result).toContain("New &lt;Event&gt;");expect(result).toContain('href="https://example.com/book"');
  });
  it("connects featured courses into the retained CV Ready Most Wanted slot",()=>{
    const html='<div class="box-style-45 d-flex align-items-stretch gap-3 justify-content-center flex-wrap"><p class="text-muted">No featured courses yet. Mark courses as "show in picks" in admin.</p></div>';
    const result=applyFeaturedCatalogCards(html,"courses",[{id:4,title:"Wanted course",summary:"Live",saved:false}]);
    expect(result).toContain('data-relational-catalog="featured-courses"');
    expect(result).toContain('/programsfull/program/4?type=course');
    expect(result).not.toContain("No featured courses yet");
  });
});
