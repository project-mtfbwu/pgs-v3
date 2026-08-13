import Link from "next/link";
import { AdminPageHeader } from "@/components/admin-page-header";
import { catalogEntities } from "@/lib/admin-registry";
import { requireStaffPermission } from "@/lib/staff-auth";
export default async function CatalogPage(){await requireStaffPermission("catalog.read");return <main className="ops-page"><AdminPageHeader eyebrow="Catalog" title="Relational catalog operations" description="Manage publication-ready universities, programs, courses, events, tags, categories, and filter metadata."/><section className="ops-module-grid">{Object.values(catalogEntities).map((entity)=><Link className="ops-card" href={`/admin/catalog/${entity.key}`} key={entity.key}><span className="ops-badge">Catalog</span><h2>{entity.label}</h2><p>{entity.description}</p><strong>Manage records →</strong></Link>)}</section></main>}

