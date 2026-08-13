import Link from "next/link";
import { AdminPageHeader } from "@/components/admin-page-header";
import { contentEntities } from "@/lib/admin-registry";
import { requireStaffPermission } from "@/lib/staff-auth";
export default async function ContentPage(){await requireStaffPermission("content.read");return <main className="ops-page"><AdminPageHeader eyebrow="Content" title="Approved content systems" description="Page layouts remain in code. Staff manage typed page slots and structured content records."/><section className="ops-module-grid"><Link className="ops-card is-featured" href="/admin/content/pages"><span className="ops-badge">Revisioned CMS</span><h2>CMS Pages</h2><p>Draft, preview, publish, unpublish, and roll back page-specific content slots.</p><strong>Open CMS pages →</strong></Link>{Object.values(contentEntities).map((entity)=><Link className="ops-card" href={`/admin/content/modules/${entity.key}`} key={entity.key}><span className="ops-badge">Structured</span><h2>{entity.label}</h2><p>{entity.description}</p><strong>Manage module →</strong></Link>)}</section></main>}

