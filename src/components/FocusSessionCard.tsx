import { Play, Pause, Square } from "lucide-react";
import type { FocusSession } from "@/lib/supabase/types";

interface FocusSessionCardProps {
  session: FocusSession;
  elapsedSeconds: number;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
}

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusSessionCard({ session, elapsedSeconds, onPause, onResume, onEnd }: FocusSessionCardProps) {
  const plannedSeconds = session.planned_minutes * 60;
  const pct = Math.min(100, (elapsedSeconds / plannedSeconds) * 100);

  return (
    <div className="overflow-hidden rounded-2xl border border-blue/30 bg-gradient-to-br from-blue-dark/40 to-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-blue-light">Active Focus Session</p>
          <p className="mt-0.5 text-sm text-text-secondary">{session.preset}</p>
        </div>
        <span className="rounded-full bg-blue/15 px-2.5 py-1 text-xs font-semibold text-blue-light capitalize">{session.status}</span>
      </div>

      <p className="mt-4 text-4xl font-semibold tabular-nums text-text">{formatClock(elapsedSeconds)}</p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-card-secondary">
        <div className="h-full rounded-full bg-blue transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-4 flex gap-2">
        {session.status === "running" ? (
          <button onClick={onPause} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold text-text transition-colors hover:bg-card-secondary">
            <Pause className="h-4 w-4" strokeWidth={2} /> Pause
          </button>
        ) : (
          <button onClick={onResume} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold text-text transition-colors hover:bg-card-secondary">
            <Play className="h-4 w-4" strokeWidth={2} /> Resume
          </button>
        )}
        <button onClick={onEnd} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue text-sm font-semibold text-white transition-colors hover:bg-blue/90">
          <Square className="h-3.5 w-3.5" strokeWidth={2} /> End
        </button>
      </div>
    </div>
  );
}
