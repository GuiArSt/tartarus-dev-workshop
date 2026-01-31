import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-shimmer rounded-md bg-[var(--tartarus-elevated)]", className)}
      {...props}
    />
  );
}

export { Skeleton };
