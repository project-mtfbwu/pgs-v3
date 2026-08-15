import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return <input type={type} className={cn("ops:flex ops:h-10 ops:w-full ops:rounded-md ops:border ops:border-input ops:bg-card ops:px-3 ops:py-2 ops:text-sm ops:outline-none ops:placeholder:text-muted-foreground ops:focus-visible:ring-2 ops:focus-visible:ring-ring ops:disabled:cursor-not-allowed ops:disabled:opacity-50", className)} {...props} />;
}
