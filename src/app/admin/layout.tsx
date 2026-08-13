import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getAuthenticatedUser } from "@/lib/auth";
import { getStaffContext } from "@/lib/staff-auth";

export const dynamic="force-dynamic";
export default async function AdminLayout({children}:{children:React.ReactNode}){const user=await getAuthenticatedUser();if(!user)redirect("/login?redirect=%2Fadmin");const context=await getStaffContext();if(!context)redirect("/student/dashboard");return <AdminShell displayName={context.displayName} roles={context.roles} permissions={[...context.permissions]}>{children}</AdminShell>}

