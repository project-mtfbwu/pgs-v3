"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  Gauge,
  GraduationCap,
  LogOut,
  Menu,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import { OperationsActorMenu } from "@/components/operations-actor-menu";
import { OperationsStaffSearch } from "@/components/operations-staff-search";
import { StaffPreviewBanner } from "@/components/staff-preview-banner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { canViewOperationsScoreboard } from "@/lib/operations-authorization";
import { operationsRoboto } from "@/lib/operations-font";
import { operationsInitials, operationsRoleLabel } from "@/lib/operations-presentation";
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
  { href: "/ops/work", label: "Targets", permission: "overview.read", icon: BriefcaseBusiness },
  { href: "/ops/team", label: "Team", permission: "staff.read", icon: UsersRound },
  { href: "/ops/notifications", label: "Notifications", permission: "overview.read", icon: Bell },
  { href: "/ops/activity", label: "Activity", permission: "audit.read", icon: Activity }
];

const sectionTitles: Record<string, string> = {
  "/ops": "Operations Scoreboard",
  "/ops/students": "Students",
  "/ops/work": "Staff Targets",
  "/ops/team": "Team",
  "/ops/team/invite": "Invite staff",
  "/ops/notifications": "Notifications",
  "/ops/activity": "Activity"
};

export function AdminShell({
  children,
  displayName,
  roles,
  permissions,
  notificationUnreadCount = 0,
  preview = null
}: {
  children: React.ReactNode;
  displayName: string;
  roles: StaffRoleKey[];
  permissions: StaffPermission[];
  notificationUnreadCount?: number;
  preview?: { mode: "student" | "mentor"; targetName: string; actorName: string } | null;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isOperationsProduct = pathname === "/ops" || pathname.startsWith("/ops/");
  const allowed = new Set(permissions);
  const canViewScoreboard = canViewOperationsScoreboard({ roles, permissions: allowed });
  const mentorPreview = preview?.mode === "mentor";
  const visibleItems = items.filter((item) => {
    if (!allowed.has(item.permission) || (item.scoreboard && !canViewScoreboard)) return false;
    if (mentorPreview && (item.href === "/ops/team" || item.href === "/ops/activity")) return false;
    return true;
  });
  const title = pathname.startsWith("/ops/team/") && pathname !== "/ops/team/invite"
    ? "Staff access"
    : (sectionTitles[pathname] ?? "Operations");
  const currentRole = operationsRoleLabel(roles);

  useEffect(() => {
    if (!isOperationsProduct) return;
    const root = document.documentElement;
    root.classList.add("operations-session", operationsRoboto.variable);
    return () => {
      root.classList.remove("operations-session", operationsRoboto.variable);
    };
  }, [isOperationsProduct]);

  const navigation = (
    <nav aria-label="Operations navigation" className="ops-system-navigation ops:flex ops:flex-col ops:gap-1">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== "/ops" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => setMobileNavOpen(false)}
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
    <TooltipProvider>
      <div
        data-operations-shell
        data-operations-product={isOperationsProduct ? "true" : undefined}
        className={cn(
          "operations-root ops:min-h-screen ops:bg-background ops:text-foreground",
          isOperationsProduct && operationsRoboto.variable
        )}
      >
        <aside className="ops-system-sidebar ops:fixed ops:inset-y-0 ops:left-0 ops:z-30 ops:hidden ops:w-64 ops:flex-col ops:border-r ops:border-border ops:bg-card ops:px-4 ops:py-5 ops:lg:flex">
          <Link href="/ops" className="ops-system-brand ops:flex ops:items-center ops:gap-3 ops:px-2 ops:no-underline">
            <span className="ops:flex ops:size-9 ops:items-center ops:justify-center ops:rounded-lg ops:bg-primary ops:text-sm ops:font-bold ops:text-primary-foreground">P</span>
            <span className="ops:flex ops:flex-col">
              <strong className="ops:text-sm ops:tracking-tight">Purple Guide</strong>
              <span className="ops:text-xs ops:text-muted-foreground">Operations</span>
            </span>
          </Link>
          <div className="ops:mt-8 ops:flex-1">{navigation}</div>
          <Separator className="ops:mb-4" />
          <div className="ops-system-user">
            <div className="ops:flex ops:items-center ops:gap-3 ops:px-2">
              <Avatar size="lg">
                <AvatarFallback className="ops:bg-accent ops:text-xs ops:font-bold ops:text-accent-foreground">
                  {operationsInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="ops:min-w-0 ops:flex-1">
                <strong className="ops:block ops:truncate ops:text-sm">{displayName}</strong>
                <span className="ops:block ops:truncate ops:text-xs ops:text-muted-foreground">{currentRole}</span>
              </span>
              <Link href="/logout?next=/ops" aria-label="Sign out" className="ops:text-muted-foreground ops:hover:text-foreground">
                <LogOut aria-hidden="true" className="ops:size-4" />
              </Link>
            </div>
          </div>
        </aside>

        <div className="ops-system-content ops:min-w-0 ops:lg:pl-64">
          <header className="ops-system-topbar ops:sticky ops:top-0 ops:z-20 ops:flex ops:h-[72px] ops:items-center ops:justify-between ops:border-b ops:border-border ops:bg-card ops:px-4 ops:sm:px-6">
            <div className="ops:flex ops:min-w-0 ops:flex-col ops:justify-center">
              <p className="ops-system-context ops:m-0 ops:flex ops:items-center ops:gap-1.5 ops:text-xs ops:font-semibold ops:uppercase ops:tracking-[0.08em] ops:text-muted-foreground">
                <ShieldCheck aria-hidden="true" className="ops:size-3.5" />
                Internal operations
              </p>
              <div className="ops:flex ops:min-w-0 ops:items-center ops:gap-3">
                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                  <SheetTrigger
                    aria-label="Open operations navigation"
                    className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "ops-system-topbar-menu ops:lg:hidden")}
                  >
                    <Menu aria-hidden="true" className="ops:size-4" />
                  </SheetTrigger>
                  <SheetContent side="left" className="ops:w-[min(20rem,90vw)] ops:border-r ops:bg-card ops:p-0 ops:shadow-none">
                    <SheetHeader className="ops:border-b ops:border-border ops:px-4 ops:py-5">
                      <SheetTitle className="ops-system-nav-sheet-title">Purple Guide</SheetTitle>
                      <SheetDescription className="ops-system-nav-sheet-description">Operations</SheetDescription>
                    </SheetHeader>
                    <div className="ops:px-3 ops:py-4">{navigation}</div>
                  </SheetContent>
                </Sheet>
                {isOperationsProduct ? (
                  <p className="ops-system-current-section ops:m-0 ops:truncate ops:tracking-tight">{title}</p>
                ) : (
                  <h1 className="ops:m-0 ops:truncate ops:text-base ops:font-semibold ops:tracking-tight">{title}</h1>
                )}
              </div>
            </div>
            <div className="ops:flex ops:items-center ops:gap-2">
              {allowed.has("overview.read") ? <OperationsStaffSearch /> : null}
              {allowed.has("overview.read") ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/ops/notifications"
                      aria-label={`Open notifications${notificationUnreadCount ? `, ${notificationUnreadCount} unread` : ""}`}
                      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "ops-system-topbar-notify ops:relative")}
                    >
                      <Bell aria-hidden="true" className="ops:size-4" />
                      {notificationUnreadCount ? (
                        <span className="ops:absolute ops:-right-1 ops:-top-1 ops:flex ops:min-h-4 ops:min-w-4 ops:items-center ops:justify-center ops:rounded-full ops:bg-destructive ops:px-1 ops:text-[10px] ops:font-bold ops:leading-4 ops:text-destructive-foreground">
                          {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                        </span>
                      ) : null}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>
              ) : null}
              <OperationsActorMenu displayName={displayName} roleLabel={currentRole} />
            </div>
          </header>

          <main className="ops-system-main ops:mx-auto ops:w-full ops:max-w-[1440px] ops:p-4 ops:sm:p-6 ops:lg:p-8">
            {preview ? (
              <div className="ops:mb-4">
                <StaffPreviewBanner actorName={preview.actorName} mode={preview.mode} targetName={preview.targetName} />
              </div>
            ) : null}
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
