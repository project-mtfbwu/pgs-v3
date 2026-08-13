"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { StaffPermission, StaffRoleKey } from "@/lib/staff-auth";

type Item={href:string;label:string;permission:StaffPermission};
const groups:Array<{label:string;items:Item[]}>= [
  {label:"Workspace",items:[{href:"/admin",label:"Overview",permission:"overview.read"},{href:"/admin/students",label:"Students",permission:"overview.read"},{href:"/admin/access",label:"Premium & assignments",permission:"premium.manage"},{href:"/admin/profile",label:"My profile",permission:"overview.read"}]},
  {label:"Catalog",items:[{href:"/admin/catalog",label:"Catalog overview",permission:"catalog.read"},{href:"/admin/catalog/universities",label:"Universities",permission:"catalog.read"},{href:"/admin/catalog/programs",label:"Programs",permission:"catalog.read"},{href:"/admin/catalog/courses",label:"Courses",permission:"catalog.read"},{href:"/admin/catalog/events",label:"Events / Webinars",permission:"catalog.read"},{href:"/admin/catalog/tags",label:"Tags",permission:"catalog.read"},{href:"/admin/catalog/facets",label:"Filters / Metadata",permission:"catalog.read"}]},
  {label:"Content",items:[{href:"/admin/content",label:"CMS & content",permission:"content.read"},{href:"/admin/content/pages",label:"CMS pages",permission:"cms.read"},{href:"/admin/media",label:"Media",permission:"media.read"}]},
  {label:"Operations",items:[{href:"/admin/leads",label:"Leads / Enquiries",permission:"leads.read"},{href:"/admin/staff",label:"Staff",permission:"staff.read"},{href:"/admin/audit",label:"Audit",permission:"audit.read"},{href:"/admin/settings",label:"Settings",permission:"settings.read"}]}
];

export function AdminShell({children,displayName,roles,permissions}:{children:React.ReactNode;displayName:string;roles:StaffRoleKey[];permissions:StaffPermission[]}){
  const [open,setOpen]=useState(false);const pathname=usePathname();const allowed=new Set(permissions);
  return <div className="ops-app"><button type="button" className="ops-menu-button" aria-expanded={open} aria-controls="ops-sidebar" onClick={()=>setOpen(!open)}>☰<span>Menu</span></button>{open&&<button className="ops-backdrop" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}<aside id="ops-sidebar" className={open?"is-open":""}><div className="ops-brand"><Link href="/admin">#PGS</Link><span>Operations</span></div><nav aria-label="Staff navigation">{groups.map((group)=>{const items=group.items.filter((item)=>allowed.has(item.permission));if(!items.length)return null;return <section key={group.label}><h2>{group.label}</h2>{items.map((item)=><Link key={item.href} href={item.href} aria-current={pathname===item.href?"page":undefined} onClick={()=>setOpen(false)}>{item.label}</Link>)}</section>})}</nav><footer><strong>{displayName}</strong><span>{roles.map((role)=>role.replaceAll("_"," ")).join(" · ")}</span><Link href="/logout">Sign out</Link></footer></aside><div className="ops-main"><header className="ops-topbar"><div><span>Internal control center</span><strong>{displayName}</strong></div><Link href="/">Open public site ↗</Link></header>{children}</div></div>;
}
