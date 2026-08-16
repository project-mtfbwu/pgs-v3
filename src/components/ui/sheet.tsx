"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "ops:fixed ops:inset-0 ops:z-50 ops:bg-black/50 ops:data-[state=closed]:animate-out ops:data-[state=closed]:fade-out-0 ops:data-[state=open]:animate-in ops:data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "ops:fixed ops:z-50 ops:flex ops:flex-col ops:gap-4 ops:bg-background ops:shadow-lg ops:transition ops:ease-in-out ops:data-[state=closed]:animate-out ops:data-[state=closed]:duration-300 ops:data-[state=open]:animate-in ops:data-[state=open]:duration-500",
          side === "right" &&
            "ops:inset-y-0 ops:right-0 ops:h-full ops:w-3/4 ops:border-l ops:data-[state=closed]:slide-out-to-right ops:data-[state=open]:slide-in-from-right ops:sm:max-w-sm",
          side === "left" &&
            "ops:inset-y-0 ops:left-0 ops:h-full ops:w-3/4 ops:border-r ops:data-[state=closed]:slide-out-to-left ops:data-[state=open]:slide-in-from-left ops:sm:max-w-sm",
          side === "top" &&
            "ops:inset-x-0 ops:top-0 ops:h-auto ops:border-b ops:data-[state=closed]:slide-out-to-top ops:data-[state=open]:slide-in-from-top",
          side === "bottom" &&
            "ops:inset-x-0 ops:bottom-0 ops:h-auto ops:border-t ops:data-[state=closed]:slide-out-to-bottom ops:data-[state=open]:slide-in-from-bottom",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close className="ops:absolute ops:top-4 ops:right-4 ops:rounded-xs ops:opacity-70 ops:ring-offset-background ops:transition-opacity ops:hover:opacity-100 ops:focus:ring-2 ops:focus:ring-ring ops:focus:ring-offset-2 ops:focus:outline-hidden ops:disabled:pointer-events-none ops:data-[state=open]:bg-secondary">
            <XIcon className="ops:size-4" />
            <span className="ops:sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("ops:flex ops:flex-col ops:gap-1.5 ops:p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("ops:mt-auto ops:flex ops:flex-col ops:gap-2 ops:p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("ops:font-semibold ops:text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("ops:text-sm ops:text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
