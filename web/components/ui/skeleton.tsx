import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[var(--tartarus-elevated)] rounded-md skeleton-shimmer",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
