import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminSettingsManager } from "@/components/admin-settings-manager";
import { can,requireStaffPermission } from "@/lib/staff-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export default async function SettingsPage(){const context=await requireStaffPermission("settings.read");const supabase=await createSupabaseServerClient();const {data}=await supabase.from("site_settings").select("key,value,description,updated_at").order("key");return <main className="ops-page"><AdminPageHeader eyebrow="Settings" title="Controlled application settings" description="Provider credentials never live here. This area stores approved non-secret operational configuration only."/><AdminSettingsManager settings={(data??[]) as Array<Record<string,unknown>>} canManage={can(context,"settings.manage")}/></main>}

