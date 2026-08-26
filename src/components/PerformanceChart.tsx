"use client";

import { useId } from "react";
import { Settings } from "lucide-react";
import { SegmentedControl } from "@/components/SegmentedControl";
import { cn } from "@/lib/utils";

interface PerformanceChartProps<P extends string> {
  title: string;
  subtitleLines?: string[];
  data: { label: string; value: number }[];
  period: P;
  onPeriodChange: (period: P) => void;
  periods: { value: P; label: string }[];
  statLabel: string;
  statValue: string;
  delta?: string;
  trendPct?: string;
  trendDirection?: "up" | "down";
  height?: number;
  onSettingsClick?: () => void;
}

/** The design lab's consistency/trend chart card — used for life-performance tracking (sleep, diet, fitness, lock-in streaks). */
export function PerformanceChart<P extends string>({
  title,
  subtitleLines,
  data,
  period,
  onPeriodChange,
  periods,
  statLabel,
  statValue,
  delta,
  trendPct,
  trendDirection = "up",
  height = 140,
  onSettingsClick,
}: PerformanceChartProps<P>) {
  const gradientId = useId();
  const w = 300;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const n = data.length;
  const points = data.map((d, i) => [n > 1 ? (i / (n - 1)) * w : w / 2, height - ((d.value - min) / range) * (height - 16) - 6]);
  const line = points.length ? "M" + points.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" L") : "";
  const area = points.length ? `${line} L${w},${height} L0,${height} Z` : "";
  const gridCols = Math.min(n, 6);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          {subtitleLines?.map((line, i) => (
            <p key={i} className="mt-0.5 text-xs text-text-secondary">
              {line}
            </p>
          ))}
        </div>
        {onSettingsClick && (
          <button type="button" onClick={onSettingsClick} aria-label="Settings" className="text-text-secondary transition-colors hover:text-text">
            <Settings className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="mt-3">
        <SegmentedControl value={period} onChange={onPeriodChange} options={periods} />
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center text-xs text-text-secondary" style={{ height }}>
          No data yet
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${w} ${height}`}
          preserveAspectRatio="none"
          className="mt-4 w-full"
          style={{ height }}
          role="img"
          aria-label={`${title}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--color-success)", stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: "var(--color-success)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {Array.from({ length: gridCols }).map((_, i) => {
            const x = gridCols > 1 ? (i / (gridCols - 1)) * w : w / 2;
            return <line key={i} x1={x} y1={0} x2={x} y2={height} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="2,3" />;
          })}
          <path d={area} fill={`url(#${gradientId})`} stroke="none" />
          <path d={line} fill="none" stroke="var(--color-success)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {points.length > 0 && (
            <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="3.5" fill="var(--color-success)" stroke="var(--color-bg)" strokeWidth="1.5" />
          )}
        </svg>
      )}

      <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
        <div>
          <p className="text-xs text-text-secondary">{statLabel}</p>
          <p className="mt-0.5 flex items-baseline gap-1.5 text-2xl font-bold text-text">
            {statValue}
            {delta && <span className="text-sm font-semibold text-success">{delta}</span>}
          </p>
        </div>
        {trendPct && (
          <span className={cn("flex items-center gap-1 text-sm font-semibold", trendDirection === "up" ? "text-success" : "text-error")}>
            {trendDirection === "up" ? "↗" : "↘"} {trendPct}
          </span>
        )}
      </div>
    </div>
  );
}
