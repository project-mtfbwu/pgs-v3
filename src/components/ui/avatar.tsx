"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "sm" | "lg"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "ops:group/avatar ops:relative ops:flex ops:size-8 ops:shrink-0 ops:overflow-hidden ops:rounded-full ops:select-none ops:data-[size=lg]:size-10 ops:data-[size=sm]:size-6",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("ops:aspect-square ops:size-full", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "ops:flex ops:size-full ops:items-center ops:justify-center ops:rounded-full ops:bg-muted ops:text-sm ops:text-muted-foreground ops:group-data-[size=sm]/avatar:text-xs",
        className
      )}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "ops:absolute ops:right-0 ops:bottom-0 ops:z-10 ops:inline-flex ops:items-center ops:justify-center ops:rounded-full ops:bg-primary ops:text-primary-foreground ops:ring-2 ops:ring-background ops:select-none",
        "ops:group-data-[size=sm]/avatar:size-2 ops:group-data-[size=sm]/avatar:[&>svg]:hidden",
        "ops:group-data-[size=default]/avatar:size-2.5 ops:group-data-[size=default]/avatar:[&>svg]:size-2",
        "ops:group-data-[size=lg]/avatar:size-3 ops:group-data-[size=lg]/avatar:[&>svg]:size-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "ops:group/avatar-group ops:flex ops:-space-x-2 ops:*:data-[slot=avatar]:ring-2 ops:*:data-[slot=avatar]:ring-background",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "ops:relative ops:flex ops:size-8 ops:shrink-0 ops:items-center ops:justify-center ops:rounded-full ops:bg-muted ops:text-sm ops:text-muted-foreground ops:ring-2 ops:ring-background ops:group-has-data-[size=lg]/avatar-group:size-10 ops:group-has-data-[size=sm]/avatar-group:size-6 ops:[&>svg]:size-4 ops:group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 ops:group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
}
