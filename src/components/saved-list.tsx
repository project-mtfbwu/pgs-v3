"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type MediaAsset={bucket:string;path:string;alt_text:string};
type CatalogTagLink={catalog_tags:{name:string}|Array<{name:string}>|null};
type CatalogItem={id:number;title:string;slug:string;short_description:string;image_asset_id:string|null;media_assets:MediaAsset|MediaAsset[]|null;program_tags?:CatalogTagLink[];course_tags?:CatalogTagLink[]};
export type SavedProgram={program_id:number;programs:CatalogItem|null};
export type SavedCourse={course_id:number;courses:CatalogItem|null};

function image(item:CatalogItem,fallback:string){
  const relation=Array.isArray(item.media_assets)?item.media_assets[0]:item.media_assets;
  const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
  return relation?.bucket==="marketing-public"&&base?`${base}/storage/v1/object/public/${relation.bucket}/${relation.path}`:fallback;
}
function tags(item:CatalogItem){
  const links=item.program_tags??item.course_tags??[];
  const values=links.flatMap((link)=>Array.isArray(link.catalog_tags)?link.catalog_tags:[link.catalog_tags]).filter((value):value is {name:string}=>Boolean(value?.name)).map((value)=>value.name);
  return values.length?values.slice(0,3):["PGS"];
}

export function SavedList({programs:initialPrograms,courses:initialCourses,readOnly=false}:{programs:SavedProgram[];courses:SavedCourse[];readOnly?:boolean}){
  const [programs,setPrograms]=useState(initialPrograms);const [courses,setCourses]=useState(initialCourses);const [status,setStatus]=useState("");
  async function remove(kind:"programs"|"courses",id:number){
    if(readOnly)return;
    const response=await fetch(`/api/student/saved/${kind}/${id}`,{method:"DELETE"});if(!response.ok){setStatus("Unable to remove that saved item.");return;}if(kind==="programs")setPrograms((items)=>items.filter((item)=>item.program_id!==id));else setCourses((items)=>items.filter((item)=>item.course_id!==id));setStatus("Removed from saved.");
  }
  const empty=!programs.length&&!courses.length;
  return <div className="saved-list-pgs developer-saved-picks">
    {status&&<p role="status">{status}</p>}
    {courses.length>0&&<section className="developer-saved-section" aria-label="Saved courses">
      <h2 className="fnt-family">Saved Courses</h2>
      <div className="developer-saved-grid">{courses.map((item)=>item.courses&&<article className="sop-card-unique" key={item.course_id}>
        <div className="sop-image-wrapper"><Image src={image(item.courses,"/assets/img/saved_2.jpg")} alt="" width={360} height={180} unoptimized/>{readOnly?null:<button className="sop-heart-icon" onClick={()=>remove("courses",item.course_id)} aria-label={`Remove ${item.courses?.title}`}>♥</button>}</div>
        <div className="sop-content"><h3 className="sop-title fnt-family">{item.courses.title}</h3><p className="sop-subtext">{item.courses.short_description}</p><div className="sop-tags">{tags(item.courses).map((tag)=><span className="sop-tag" key={tag}>#{tag.replace(/^#/,"")}</span>)}</div><Link className="sop-learn-btn" href={`/programsfull/program/${item.courses.id}?type=course`}>Learn More</Link></div>
      </article>)}</div>
    </section>}
    {programs.length>0&&<section className="developer-saved-section" aria-label="Saved programs">
      <h2 className="fnt-family">Saved Programs</h2>
      <div className="developer-saved-grid">{programs.map((item)=>item.programs&&<article className="sop-card-unique is-program" key={item.program_id}>
        <div className="sop-top-label"><Image src="/assets/img/heart.gif" alt="" width={38} height={38} unoptimized/><span>CV-READY PROGRAM</span></div>
        <div className="sop-image-wrapper"><Image src={image(item.programs,"/assets/img/saved_4.jpg")} alt="" width={420} height={220} unoptimized/>{readOnly?null:<button className="sop-heart-icon" onClick={()=>remove("programs",item.program_id)} aria-label={`Remove ${item.programs?.title}`}>♥</button>}</div>
        <div className="sop-content"><h3 className="sop-title fnt-family">{item.programs.title}</h3><p className="sop-subtext">{item.programs.short_description}</p><div className="sop-tags">{tags(item.programs).map((tag)=><span className="sop-tag" key={tag}>#{tag.replace(/^#/,"")}</span>)}</div><div className="developer-saved-actions"><Link className="sop-learn-btn" href={`/programsfull/program/${item.programs.id}`}>Learn More</Link><Image src="/assets/img/qr-2.png" alt="Program QR" width={62} height={62} unoptimized/></div></div>
      </article>)}</div>
    </section>}
    {empty&&<div className="pgs-empty-state"><h2>Your saved list is ready</h2><p>Save published courses and programs to find them here.</p><Link href="/cvreadyprogram">Discover programs</Link></div>}
  </div>;
}
