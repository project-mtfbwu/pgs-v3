import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("ops:rounded-xl ops:border ops:border-border ops:bg-card ops:text-card-foreground ops:shadow-sm", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.ComponentProps<"header">) {
  return <header className={cn("ops:flex ops:flex-col ops:gap-1.5 ops:p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("ops:m-0 ops:text-base ops:font-semibold ops:tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("ops:m-0 ops:text-sm ops:leading-6 ops:text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("ops:p-5 ops:pt-0", className)} {...props} />;
}
