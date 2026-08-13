import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminProfileForm } from "@/components/admin-profile-form";
import { requireStaffPermission } from "@/lib/staff-auth";
export default async function AdminProfilePage(){const context=await requireStaffPermission("overview.read");return <main className="ops-page"><AdminPageHeader eyebrow="Account" title="Staff profile" description="Identity and password remain in Supabase Auth. Updating this display name cannot change roles or status."/><AdminProfileForm displayName={context.displayName} email={context.user.email??""}/></main>}
