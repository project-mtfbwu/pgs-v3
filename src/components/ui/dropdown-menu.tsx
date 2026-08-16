"use client"

import * as React from "react"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  )
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "ops:z-50 ops:max-h-(--radix-dropdown-menu-content-available-height) ops:min-w-[8rem] ops:origin-(--radix-dropdown-menu-content-transform-origin) ops:overflow-x-hidden ops:overflow-y-auto ops:rounded-md ops:border ops:bg-popover ops:p-1 ops:text-popover-foreground ops:shadow-md ops:data-[side=bottom]:slide-in-from-top-2 ops:data-[side=left]:slide-in-from-right-2 ops:data-[side=right]:slide-in-from-left-2 ops:data-[side=top]:slide-in-from-bottom-2 ops:data-[state=closed]:animate-out ops:data-[state=closed]:fade-out-0 ops:data-[state=closed]:zoom-out-95 ops:data-[state=open]:animate-in ops:data-[state=open]:fade-in-0 ops:data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "ops:relative ops:flex ops:cursor-default ops:items-center ops:gap-2 ops:rounded-sm ops:px-2 ops:py-1.5 ops:text-sm ops:outline-hidden ops:select-none ops:focus:bg-accent ops:focus:text-accent-foreground ops:data-[disabled]:pointer-events-none ops:data-[disabled]:opacity-50 ops:data-[inset]:pl-8 ops:data-[variant=destructive]:text-destructive ops:data-[variant=destructive]:focus:bg-destructive/10 ops:data-[variant=destructive]:focus:text-destructive ops:dark:data-[variant=destructive]:focus:bg-destructive/20 ops:[&_svg]:pointer-events-none ops:[&_svg]:shrink-0 ops:[&_svg:not([class*=size-])]:size-4 ops:[&_svg:not([class*=text-])]:text-muted-foreground ops:data-[variant=destructive]:*:[svg]:text-destructive!",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "ops:relative ops:flex ops:cursor-default ops:items-center ops:gap-2 ops:rounded-sm ops:py-1.5 ops:pr-2 ops:pl-8 ops:text-sm ops:outline-hidden ops:select-none ops:focus:bg-accent ops:focus:text-accent-foreground ops:data-[disabled]:pointer-events-none ops:data-[disabled]:opacity-50 ops:[&_svg]:pointer-events-none ops:[&_svg]:shrink-0 ops:[&_svg:not([class*=size-])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="ops:pointer-events-none ops:absolute ops:left-2 ops:flex ops:size-3.5 ops:items-center ops:justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="ops:size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "ops:relative ops:flex ops:cursor-default ops:items-center ops:gap-2 ops:rounded-sm ops:py-1.5 ops:pr-2 ops:pl-8 ops:text-sm ops:outline-hidden ops:select-none ops:focus:bg-accent ops:focus:text-accent-foreground ops:data-[disabled]:pointer-events-none ops:data-[disabled]:opacity-50 ops:[&_svg]:pointer-events-none ops:[&_svg]:shrink-0 ops:[&_svg:not([class*=size-])]:size-4",
        className
      )}
      {...props}
    >
      <span className="ops:pointer-events-none ops:absolute ops:left-2 ops:flex ops:size-3.5 ops:items-center ops:justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="ops:size-2 ops:fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "ops:px-2 ops:py-1.5 ops:text-sm ops:font-medium ops:data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("ops:-mx-1 ops:my-1 ops:h-px ops:bg-border", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ops:ml-auto ops:text-xs ops:tracking-widest ops:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "ops:flex ops:cursor-default ops:items-center ops:gap-2 ops:rounded-sm ops:px-2 ops:py-1.5 ops:text-sm ops:outline-hidden ops:select-none ops:focus:bg-accent ops:focus:text-accent-foreground ops:data-[inset]:pl-8 ops:data-[state=open]:bg-accent ops:data-[state=open]:text-accent-foreground ops:[&_svg]:pointer-events-none ops:[&_svg]:shrink-0 ops:[&_svg:not([class*=size-])]:size-4 ops:[&_svg:not([class*=text-])]:text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ops:ml-auto ops:size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "ops:z-50 ops:min-w-[8rem] ops:origin-(--radix-dropdown-menu-content-transform-origin) ops:overflow-hidden ops:rounded-md ops:border ops:bg-popover ops:p-1 ops:text-popover-foreground ops:shadow-lg ops:data-[side=bottom]:slide-in-from-top-2 ops:data-[side=left]:slide-in-from-right-2 ops:data-[side=right]:slide-in-from-left-2 ops:data-[side=top]:slide-in-from-bottom-2 ops:data-[state=closed]:animate-out ops:data-[state=closed]:fade-out-0 ops:data-[state=closed]:zoom-out-95 ops:data-[state=open]:animate-in ops:data-[state=open]:fade-in-0 ops:data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
