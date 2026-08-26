"use client";

import { cn } from "@/lib/utils";

interface FinanceStatCardProps {
  label: string;
  value: string;
  trendPct?: string;
  trendDirection?: "up" | "down";
  subLabel?: string;
  bars: number[];
}

/** The design lab's finance stat card — big value + trend + a compact bar visualization, used across Finance. */
export function FinanceStatCard({ label, value, trendPct, trendDirection = "up", subLabel, bars }: FinanceStatCardProps) {
  const max = Math.max(...bars.map((b) => Math.abs(b)), 1);

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="min-w-0">
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="mt-1 flex items-baseline gap-1.5 text-xl font-bold text-text">
          {value}
          {trendPct && (
            <span className={cn("text-xs font-semibold", trendDirection === "up" ? "text-success" : "text-error")}>
              {trendDirection === "up" ? "↑" : "↓"}
              {trendPct}
            </span>
          )}
        </p>
        {subLabel && <p className="mt-0.5 truncate text-xs text-text-secondary">{subLabel}</p>}
      </div>
      {bars.length > 0 && (
        <div className="flex h-10 flex-shrink-0 items-end gap-[3px]" role="img" aria-label={`${label} recent trend`}>
          {bars.map((b, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full bg-success"
              style={{ height: `${Math.max(8, (Math.abs(b) / max) * 100)}%`, opacity: 0.45 + 0.55 * (i / Math.max(1, bars.length - 1)) }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
