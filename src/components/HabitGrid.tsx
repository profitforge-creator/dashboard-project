import { cn } from "@/lib/utils";

interface HabitGridProps {
  name: string;
  days: { date: string; completed: boolean }[]; // oldest -> newest
}

export function HabitGrid({ name, days }: HabitGridProps) {
  const streak = (() => {
    let count = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].completed) count++;
      else break;
    }
    return count;
  })();

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-text">{name}</span>
        <span className="text-xs font-medium text-text-secondary">{streak} day{streak === 1 ? "" : "s"} streak</span>
      </div>
      <div className="grid grid-cols-14 gap-1" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
        {days.map((d) => (
          <div
            key={d.date}
            title={d.date}
            className={cn("aspect-square rounded-sm", d.completed ? "bg-blue" : "bg-card-secondary")}
          />
        ))}
      </div>
    </div>
  );
}
