import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("ops:inline-flex ops:w-fit ops:items-center ops:rounded-full ops:bg-secondary ops:px-2.5 ops:py-1 ops:text-xs ops:font-semibold ops:text-secondary-foreground", className)} {...props} />;
}
