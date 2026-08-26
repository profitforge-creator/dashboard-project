import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  className?: string;
  children?: React.ReactNode;
}

export function InsightCard({ icon: Icon, title, value, trend, className, children }: InsightCardProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-secondary">
          <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        {trend && (
          <span
            className={cn(
              "text-xs font-semibold",
              trend.direction === "up" ? "text-success" : trend.direction === "down" ? "text-error" : "text-text-secondary"
            )}
          >
            {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.label}
          </span>
        )}
      </div>
      <p className="mt-2 text-xl font-semibold text-text">{value}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
