import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("ops:animate-pulse ops:rounded-md ops:bg-muted", className)} {...props} />;
}
