"use client";

interface BarChartProps {
  data: { label: string; value: number }[];
  unit?: string;
  height?: number;
}

/** Minimal SVG bar chart — no external charting library. */
export function BarChart({ data, unit = "", height = 120 }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const hasData = data.some((d) => d.value > 0);

  if (!data.length) {
    return <div className="flex h-[120px] items-center justify-center text-xs text-text-secondary">No data yet</div>;
  }

  const w = 100;
  const gap = 2;
  const barWidth = data.length ? (w - gap * (data.length - 1)) / data.length : w;

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`Bar chart: ${data.map((d) => `${d.label} ${d.value}${unit}`).join(", ")}`}
      >
        <line x1="0" y1={height - 1} x2={w} y2={height - 1} stroke="var(--color-border)" strokeWidth="0.5" />
        {hasData &&
          data.map((d, i) => {
            const h = (d.value / max) * (height - 12);
            const x = i * (barWidth + gap);
            const y = height - h;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={barWidth * 0.25}
                fill="var(--color-blue)"
                opacity={0.55 + 0.45 * (d.value / max)}
              >
                <title>
                  {d.label}: {d.value}
                  {unit}
                </title>
              </rect>
            );
          })}
      </svg>
      <div className="mt-1.5 flex justify-between text-[10px] text-text-secondary">
        {data.map((d, i) => (
          <span key={i} className={data.length > 10 && i % 2 === 1 ? "opacity-0" : ""}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
