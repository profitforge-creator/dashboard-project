interface TimelineBlock {
  startHour: number; // 0-24, fractional ok
  endHour: number;
  label: string;
  kind: "focus" | "task" | "free";
}

export function TimelineChart({ blocks }: { blocks: TimelineBlock[] }) {
  const startDay = 6;
  const endDay = 23;
  const span = endDay - startDay;
  const hourMarks = Array.from({ length: span / 3 + 1 }, (_, i) => startDay + i * 3);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="relative h-16">
        <div className="absolute inset-x-0 top-6 h-4 rounded-full bg-card-secondary" />
        {blocks.map((b, i) => {
          const left = ((Math.max(b.startHour, startDay) - startDay) / span) * 100;
          const width = ((Math.min(b.endHour, endDay) - Math.max(b.startHour, startDay)) / span) * 100;
          if (width <= 0) return null;
          return (
            <div
              key={i}
              title={b.label}
              className={`absolute top-6 h-4 rounded-full ${b.kind === "focus" ? "bg-blue" : b.kind === "task" ? "bg-blue-light/70" : "bg-transparent"}`}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
        <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-text-secondary">
          {hourMarks.map((h) => (
            <span key={h}>{h % 12 === 0 ? 12 : h % 12}{h < 12 ? "a" : "p"}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
