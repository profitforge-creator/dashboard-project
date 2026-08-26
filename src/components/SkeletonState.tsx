import { cn } from "@/lib/utils";

export function SkeletonState({ className, rows = 3 }: { className?: string; rows?: number }) {
  return (
    <div className={cn("flex flex-col gap-3", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-20 rounded-2xl border border-border" />
      ))}
    </div>
  );
}
