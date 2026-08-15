import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "ops:inline-flex ops:items-center ops:justify-center ops:gap-2 ops:whitespace-nowrap ops:rounded-md ops:text-sm ops:font-medium ops:transition-colors ops:outline-none ops:focus-visible:ring-2 ops:focus-visible:ring-ring ops:disabled:pointer-events-none ops:disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "ops:bg-primary ops:text-primary-foreground ops:hover:bg-primary/90",
        outline: "ops:border ops:border-border ops:bg-card ops:hover:bg-secondary",
        ghost: "ops:hover:bg-secondary ops:hover:text-secondary-foreground"
      },
      size: {
        default: "ops:h-10 ops:px-4 ops:py-2",
        sm: "ops:h-8 ops:rounded-md ops:px-3 ops:text-xs",
        icon: "ops:size-9"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
