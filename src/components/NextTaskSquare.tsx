"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target } from "lucide-react";
import type { Task } from "@/lib/supabase/types";
import { formatTime12h } from "@/lib/utils";

interface NextTaskSquareProps {
  task: Task | null;
}

function timeParts(task: Task, now: Date): { label: string; pct: number; level: "normal" | "soon" | "overdue" } {
  if (!task.task_time) return { label: "Anytime today", pct: 0, level: "normal" };
  const [h, m] = task.task_time.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const msUntil = target.getTime() - now.getTime();
  const dayTotalMs = target.getTime() - dayStart.getTime();
  const dayElapsedMs = now.getTime() - dayStart.getTime();
  const pct = dayTotalMs > 0 ? Math.min(100, Math.max(0, (dayElapsedMs / dayTotalMs) * 100)) : 100;

  if (msUntil <= 0) return { label: "Overdue", pct: 100, level: "overdue" };
  const mins = Math.floor(msUntil / 60000);
  if (mins < 60) return { label: `${mins}m left`, pct, level: "soon" };
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return { label: `${hrs}h ${remMins}m left`, pct, level: hrs <= 1 ? "soon" : "normal" };
}

export function NextTaskSquare({ task }: NextTaskSquareProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  if (!task) {
    return (
      <Link
        href="/goals"
        className="mx-auto flex aspect-square w-full max-w-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card p-5 text-center transition-colors hover:border-border-strong"
      >
        <Target className="h-5 w-5 text-text-secondary" strokeWidth={1.5} />
        <p className="text-xs font-medium text-text-secondary">No upcoming task</p>
      </Link>
    );
  }

  const parts = now ? timeParts(task, now) : { label: "—", pct: 0, level: "normal" as const };
  const dotColor = parts.level === "overdue" ? "bg-error" : parts.level === "soon" ? "bg-warning" : "bg-blue-light";
  const barColor = parts.level === "overdue" ? "bg-error" : parts.level === "soon" ? "bg-warning" : "bg-blue";
  const labelColor = parts.level === "overdue" ? "text-error" : parts.level === "soon" ? "text-warning" : "text-blue-light";

  return (
    <Link
      href="/goals"
      className="mx-auto flex aspect-square w-full max-w-[220px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-colors hover:border-border-strong"
    >
      <div>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${dotColor} ${parts.level !== "normal" ? "animate-pulse-glow" : ""}`} />
          <span className="label-mono text-text-secondary">Next task</span>
        </div>
        <p className="mt-3 line-clamp-3 text-lg font-semibold leading-snug text-text">{task.title}</p>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className={`text-xs font-semibold ${labelColor}`}>{parts.label}</span>
          {task.task_time && <span className="text-xs text-text-secondary">{formatTime12h(task.task_time)}</span>}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-card-secondary">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${parts.pct}%` }} />
        </div>
      </div>
    </Link>
  );
}
