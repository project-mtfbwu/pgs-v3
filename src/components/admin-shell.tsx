"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  ExternalLink,
  Gauge,
  GraduationCap,
  LogOut,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { canViewOperationsScoreboard } from "@/lib/operations-authorization";
import { cn } from "@/lib/utils";
import type { StaffPermission, StaffRoleKey } from "@/lib/staff-auth";

type Item = {
  href: string;
  label: string;
  permission: StaffPermission;
  icon: typeof Gauge;
  scoreboard?: boolean;
};

const items: Item[] = [
  { href: "/ops", label: "Scoreboard", permission: "overview.read", icon: Gauge, scoreboard: true },
  { href: "/ops/students", label: "Students", permission: "overview.read", icon: GraduationCap },
  { href: "/ops/team", label: "Team", permission: "staff.read", icon: UsersRound },
  { href: "/ops/notifications", label: "Notifications", permission: "overview.read", icon: Bell },
  { href: "/ops/activity", label: "Activity", permission: "audit.read", icon: Activity }
];

const sectionTitles: Record<string, string> = {
  "/ops": "Operations Scoreboard",
  "/ops/students": "Students",
  "/ops/team": "Team",
  "/ops/notifications": "Notifications",
  "/ops/activity": "Activity"
};

function roleLabel(roles: StaffRoleKey[]) {
  if (roles.includes("super_admin")) return "Super Admin";
  if (roles.includes("admin")) return "Admin";
  if (roles.includes("mentor")) return "Mentor";
  return "Read-only Staff";
}

export function AdminShell({
  children,
  displayName,
  roles,
  permissions
}: {
  children: React.ReactNode;
  displayName: string;
  roles: StaffRoleKey[];
  permissions: StaffPermission[];
}) {
  const pathname = usePathname();
  const allowed = new Set(permissions);
  const canViewScoreboard = canViewOperationsScoreboard({ roles, permissions: allowed });
  const visibleItems = items.filter((item) => allowed.has(item.permission) && (!item.scoreboard || canViewScoreboard));
  const title = sectionTitles[pathname] ?? "Operations";

  const navigation = (
    <nav aria-label="Operations navigation" className="ops:flex ops:gap-1 ops:lg:flex-col">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "ops:flex ops:min-w-fit ops:items-center ops:gap-3 ops:rounded-lg ops:px-3 ops:py-2.5 ops:text-sm ops:font-medium ops:text-muted-foreground ops:transition-colors ops:hover:bg-secondary ops:hover:text-foreground",
              active && "ops:bg-accent ops:text-accent-foreground"
            )}
          >
            <Icon aria-hidden="true" className="ops:size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div data-operations-shell className="operations-root ops:min-h-screen ops:bg-background ops:text-foreground">
      <aside className="ops:fixed ops:inset-y-0 ops:left-0 ops:z-30 ops:hidden ops:w-64 ops:flex-col ops:border-r ops:border-border ops:bg-card ops:px-4 ops:py-5 ops:lg:flex">
        <Link href="/ops" className="ops:flex ops:items-center ops:gap-3 ops:px-2 ops:no-underline">
          <span className="ops:flex ops:size-9 ops:items-center ops:justify-center ops:rounded-lg ops:bg-primary ops:text-sm ops:font-bold ops:text-primary-foreground">P</span>
          <span className="ops:flex ops:flex-col">
            <strong className="ops:text-sm ops:tracking-tight">Purple Guide</strong>
            <span className="ops:text-xs ops:text-muted-foreground">Operations</span>
          </span>
        </Link>
        <div className="ops:mt-8 ops:flex-1">{navigation}</div>
        <div className="ops:border-t ops:border-border ops:pt-4">
          <div className="ops:flex ops:items-center ops:gap-3 ops:px-2">
            <span className="ops:flex ops:size-9 ops:items-center ops:justify-center ops:rounded-full ops:bg-accent ops:text-xs ops:font-bold ops:text-accent-foreground">
              {displayName.slice(0, 2).toUpperCase()}
            </span>
            <span className="ops:min-w-0 ops:flex-1">
              <strong className="ops:block ops:truncate ops:text-sm">{displayName}</strong>
              <span className="ops:block ops:truncate ops:text-xs ops:text-muted-foreground">{roleLabel(roles)}</span>
            </span>
            <Link href="/logout" aria-label="Sign out" className="ops:text-muted-foreground ops:hover:text-foreground">
              <LogOut aria-hidden="true" className="ops:size-4" />
            </Link>
          </div>
        </div>
      </aside>

      <div className="ops:min-w-0 ops:lg:pl-64">
        <header className="ops:sticky ops:top-0 ops:z-20 ops:flex ops:h-16 ops:items-center ops:justify-between ops:border-b ops:border-border ops:bg-card/95 ops:px-4 ops:backdrop-blur ops:sm:px-6">
          <div>
            <p className="ops:m-0 ops:flex ops:items-center ops:gap-1.5 ops:text-[11px] ops:font-semibold ops:uppercase ops:tracking-[0.14em] ops:text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="ops:size-3.5" />
              Internal operations
            </p>
            <h1 className="ops:m-0 ops:mt-0.5 ops:text-base ops:font-semibold ops:tracking-tight">{title}</h1>
          </div>
          <div className="ops:flex ops:items-center ops:gap-2">
            <Badge className="ops:hidden ops:sm:inline-flex">{roleLabel(roles)}</Badge>
            {allowed.has("overview.read") && (
              <Link href="/ops/notifications" aria-label="Open notifications" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
                <Bell aria-hidden="true" className="ops:size-4" />
              </Link>
            )}
            <Link href="/logout" aria-label="Sign out" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "ops:lg:hidden")}>
              <LogOut aria-hidden="true" className="ops:size-4" />
            </Link>
            <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ops:hidden ops:sm:inline-flex")}>
              Public site
              <ExternalLink aria-hidden="true" className="ops:size-3.5" />
            </Link>
          </div>
        </header>

        <div className="ops:overflow-x-auto ops:border-b ops:border-border ops:bg-card ops:px-3 ops:py-2 ops:lg:hidden">
          {navigation}
        </div>

        <main className="ops:mx-auto ops:w-full ops:max-w-[1440px] ops:p-4 ops:sm:p-6 ops:lg:p-8">{children}</main>
      </div>
    </div>
  );
}
