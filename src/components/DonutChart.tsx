"use client";

interface DonutChartProps {
  data: { label: string; value: number; color?: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

const DEFAULT_PALETTE = [
  "var(--color-blue)",
  "var(--color-blue-light)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-error)",
  "var(--color-text-secondary)",
];

/** Minimal SVG donut/ring chart — no external charting library. */
export function DonutChart({ data, size = 140, thickness = 18, centerLabel, centerValue }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;

  if (total <= 0) {
    return <div className="flex items-center justify-center text-xs text-text-secondary" style={{ height: size }}>No data yet</div>;
  }

  let offset = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d, i) => {
      const frac = d.value / total;
      const dash = frac * circ;
      const seg = { ...d, dash, gap: circ - dash, offset, color: d.color ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length] };
      offset += dash;
      return seg;
    });

  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }} role="img" aria-label={`Breakdown: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--color-border)" strokeWidth={thickness} />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cx}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${seg.dash} ${seg.gap}`}
              strokeDashoffset={-seg.offset}
              strokeLinecap={segments.length > 1 ? "butt" : "round"}
            />
          ))}
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && <span className="text-lg font-bold text-text">{centerValue}</span>}
            {centerLabel && <span className="text-[10px] text-text-secondary">{centerLabel}</span>}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: seg.color }} />
            <span className="min-w-0 flex-1 truncate text-text-secondary">{seg.label}</span>
            <span className="flex-shrink-0 font-semibold text-text">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
