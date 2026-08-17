"use client";
import { useState } from "react";

type Revision={id:string;created_at:string;revision_note:string|null;content:Record<string,string>;seo_title:string|null;seo_description:string|null;open_graph:Record<string,unknown>};

function statusLabel(pageStatus:string|undefined,hasUnpublishedDraft:boolean):string{
  if(pageStatus==="published")return hasUnpublishedDraft?"Published · Draft changes":"Published";
  if(pageStatus==="unpublished")return hasUnpublishedDraft?"Unpublished · Draft changes":"Unpublished";
  return "Draft";
}

export function AdminCmsEditor({slug,defaults,page,revisions,canManage,canPublish}:{slug:string;defaults:Record<string,string>;page:{id:string;status:string;seo_title:string|null;seo_description:string|null;published_revision_id:string|null}|null;revisions:Revision[];canManage:boolean;canPublish:boolean}){
  const latest=revisions[0];
  const [content,setContent]=useState({...defaults,...(latest?.content??defaults)});
  const [seoTitle,setSeoTitle]=useState(latest?.seo_title??page?.seo_title??"");
  const [seoDescription,setSeoDescription]=useState(latest?.seo_description??page?.seo_description??"");
  const [revisionNote,setRevisionNote]=useState("");
  const [draftRevisionId,setDraftRevisionId]=useState(latest?.id??"");
  const [message,setMessage]=useState("");

  const hasUnpublishedDraft=Boolean(draftRevisionId)&&draftRevisionId!==page?.published_revision_id;
  const status=statusLabel(page?.status,hasUnpublishedDraft);
  const previewHref=draftRevisionId?`/api/admin/cms/preview?slug=${encodeURIComponent(slug)}&revision=${draftRevisionId}`:null;

  async function submit(values:Record<string,unknown>):Promise<{revision_id?:string}|null>{
    setMessage("Saving…");
    const response=await fetch("/api/admin/cms",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({slug,...values})});
    const result=await response.json() as {message?:string;revision_id?:string};
    if(!response.ok){setMessage(result.message??"Unable to save.");return null;}
    return result;
  }

  async function saveDraft(){
    const result=await submit({action:"save",content,seo_title:seoTitle,seo_description:seoDescription,revision_note:revisionNote});
    if(!result)return;
    if(result.revision_id)setDraftRevisionId(result.revision_id);
    setMessage("Draft saved. Public visitors still see published content.");
  }

  async function publication(action:"publish"|"unpublish",revisionId?:string){
    const result=await submit(action==="publish"?{action,revision_id:revisionId??draftRevisionId}:{action});
    if(!result)return;
    window.location.reload();
  }

  return <div className="ops-cms-editor">
    <section className="ops-card">
      <div className="ops-status-line">
        <span className={`ops-badge is-${page?.published_revision_id?"published":"draft"}`}>{status}</span>
        <span>{revisions.length} revision{revisions.length===1?"":"s"}</span>
      </div>
      {canManage&&<div className="ops-cms-actions">
        <button className="ops-primary" onClick={()=>void saveDraft()}>Save Draft</button>
        {previewHref
          ?<a className="ops-preview-button" href={previewHref} target="_blank" rel="noopener noreferrer">Preview ↗</a>
          :<button type="button" className="ops-preview-button" disabled aria-describedby="cms-preview-hint">Preview ↗</button>}
        {canPublish&&<button type="button" className="ops-primary" disabled={!draftRevisionId} onClick={()=>void publication("publish")}>Publish</button>}
        {canPublish&&page?.status==="published"&&<button type="button" onClick={()=>void publication("unpublish")}>Unpublish</button>}
        {!previewHref&&<span id="cms-preview-hint" className="ops-preview-hint">Save draft to preview</span>}
      </div>}
      <p role="status">{message}</p>
      <div className="ops-form-grid">
        {Object.entries(defaults).map(([key])=><label key={key} className="is-wide">
          <span>{key.replaceAll(/([A-Z])/g," $1").replaceAll("_"," ")}</span>
          <textarea rows={key.toLowerCase().includes("description")?4:2} value={content[key]??""} disabled={!canManage} onChange={(event)=>setContent((current)=>({...current,[key]:event.target.value}))}/>
        </label>)}
        {canManage&&<>
          <label><span>SEO title</span><input value={seoTitle} maxLength={255} onChange={(event)=>setSeoTitle(event.target.value)}/></label>
          <label><span>SEO description</span><textarea value={seoDescription} maxLength={500} onChange={(event)=>setSeoDescription(event.target.value)}/></label>
          <label className="is-wide"><span>Revision note</span><input value={revisionNote} maxLength={500} onChange={(event)=>setRevisionNote(event.target.value)}/></label>
        </>}
      </div>
    </section>
    <aside className="ops-card">
      <h2>Draft and publication history</h2>
      {revisions.map((revision)=><article className="ops-revision" key={revision.id}>
        <strong>{new Date(revision.created_at).toLocaleString("en-GB")}</strong>
        <span>{revision.revision_note||"No note"}</span>
        <div>
          <a href={`/api/admin/cms/preview?slug=${encodeURIComponent(slug)}&revision=${revision.id}`} target="_blank" rel="noopener noreferrer">Preview ↗</a>
          {canPublish&&<button onClick={()=>void publication(page?.published_revision_id===revision.id?"unpublish":"publish",revision.id)}>{page?.published_revision_id===revision.id?"Unpublish":"Publish"}</button>}
        </div>
      </article>)}
      {!revisions.length&&<div className="ops-empty">Save a draft to preview the actual page.</div>}
    </aside>
  </div>;
}
