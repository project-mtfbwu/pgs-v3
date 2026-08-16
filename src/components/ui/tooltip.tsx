"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "ops:z-50 ops:w-fit ops:origin-(--radix-tooltip-content-transform-origin) ops:animate-in ops:rounded-md ops:bg-foreground ops:px-3 ops:py-1.5 ops:text-xs ops:text-balance ops:text-background ops:fade-in-0 ops:zoom-in-95 ops:data-[side=bottom]:slide-in-from-top-2 ops:data-[side=left]:slide-in-from-right-2 ops:data-[side=right]:slide-in-from-left-2 ops:data-[side=top]:slide-in-from-bottom-2 ops:data-[state=closed]:animate-out ops:data-[state=closed]:fade-out-0 ops:data-[state=closed]:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="ops:z-50 ops:size-2.5 ops:translate-y-[calc(-50%_-_2px)] ops:rotate-45 ops:rounded-[2px] ops:bg-foreground ops:fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
