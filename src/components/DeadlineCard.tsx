import { Clock } from "lucide-react";
import type { Goal } from "@/lib/supabase/types";
import { cn, deadlineInfo } from "@/lib/utils";

export function DeadlineCard({ goal }: { goal: Goal }) {
  const dl = deadlineInfo(goal.deadline);
  if (!dl) return null;

  const color = dl.level === "overdue" ? "text-error" : dl.level === "urgent" ? "text-warning" : "text-blue-light";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-card-secondary", color)}>
        <Clock className="h-4.5 w-4.5" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{goal.title}</p>
        <p className={cn("text-xs font-semibold", color)}>{dl.label}</p>
      </div>
    </div>
  );
}
