"use client";

import { useId } from "react";

interface AreaChartProps {
  data: { label: string; value: number }[];
  unit?: string;
  height?: number;
}

/** Minimal SVG area/line chart — no external charting library. */
export function AreaChart({ data, unit = "", height = 120 }: AreaChartProps) {
  const gradientId = useId();

  if (!data.length) {
    return <div className="flex h-[120px] items-center justify-center text-xs text-text-secondary">No data yet</div>;
  }

  const w = 100;
  const max = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;
  const points = data.map((d, i) => [n > 1 ? (i / (n - 1)) * w : w / 2, height - (d.value / max) * (height - 12)]);
  const line = "M" + points.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" L");
  const area = `${line} L${w},${height} L0,${height} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`Trend chart: ${data.map((d) => `${d.label} ${d.value}${unit}`).join(", ")}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--color-blue)", stopOpacity: 0.35 }} />
            <stop offset="100%" style={{ stopColor: "var(--color-blue)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <line x1="0" y1={height - 1} x2={w} y2={height - 1} stroke="var(--color-border)" strokeWidth="0.5" />
        <path d={area} fill={`url(#${gradientId})`} stroke="none" />
        <path d={line} fill="none" stroke="var(--color-blue-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1.5 flex justify-between text-[10px] text-text-secondary">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
