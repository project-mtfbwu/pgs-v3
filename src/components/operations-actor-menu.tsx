"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { operationsInitials } from "@/lib/operations-presentation";
import { cn } from "@/lib/utils";

export function OperationsActorMenu({
  displayName,
  roleLabel
}: {
  displayName: string;
  roleLabel: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open account menu"
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "ops:rounded-full")}
      >
        <Avatar className="ops:size-8">
          <AvatarFallback className="ops:bg-accent ops:text-xs ops:font-bold ops:text-accent-foreground">
            {operationsInitials(displayName)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="ops:min-w-56 ops:border-border ops:shadow-none">
        <DropdownMenuLabel className="ops:font-normal">
          <span className="ops:block ops:truncate ops:text-sm ops:font-medium">{displayName}</span>
          <span className="ops:mt-0.5 ops:block ops:text-xs ops:text-muted-foreground">{roleLabel}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">Public site</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/logout">Sign out</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
