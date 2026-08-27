export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatTime12h(time: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function deadlineInfo(deadline: string | null): { pct: number; level: "normal" | "soon" | "urgent" | "overdue"; label: string } | null {
  if (!deadline) return null;
  const end = new Date(deadline).getTime();
  const now = Date.now();
  const msRemaining = end - now;
  const overdue = msRemaining < 0;
  const daysRemaining = Math.abs(msRemaining) / 86400000;

  let level: "normal" | "soon" | "urgent" | "overdue" = "normal";
  if (overdue) level = "overdue";
  else if (daysRemaining <= 2) level = "urgent";
  else if (daysRemaining <= 7) level = "soon";

  let label: string;
  if (overdue) {
    const d = Math.floor(daysRemaining);
    label = d < 1 ? "Overdue" : `Overdue ${d}d`;
  } else if (daysRemaining < 1) {
    const hrs = Math.max(Math.round(daysRemaining * 24), 1);
    label = `${hrs}h left`;
  } else {
    label = `${Math.round(daysRemaining)}d left`;
  }

  const pct = overdue ? 100 : Math.max(0, Math.min(100, 100 - (daysRemaining / 30) * 100));
  return { pct, level, label };
}

export interface GoalCountdown {
  level: "overdue" | "urgent" | "normal";
  pillLabel: string; // "6M LEFT", "22H LEFT", "5D LEFT", "OVERDUE"
  longLabel: string; // "5m 55s left", "22h left", "Overdue 2d"
  timePct: number; // 0-100, elapsed from createdAt to deadline
}

function roundedUnit(ms: number): { value: number; unit: "m" | "h" | "d" } {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return { value: Math.max(mins, 1), unit: "m" };
  const hrs = Math.round(ms / 3600000);
  if (hrs < 24) return { value: hrs, unit: "h" };
  return { value: Math.max(Math.round(ms / 86400000), 1), unit: "d" };
}

/** Precise, live-tickable countdown for a goal deadline — used by the Goals hero card and list rows. */
export function goalCountdown(deadline: string, createdAt: string, now: Date = new Date()): GoalCountdown {
  const end = new Date(deadline).getTime();
  const start = new Date(createdAt).getTime();
  const nowMs = now.getTime();
  const msRemaining = end - nowMs;
  const overdue = msRemaining < 0;
  const absMs = Math.abs(msRemaining);

  const totalSpan = Math.max(end - start, 1);
  const timePct = overdue ? 100 : Math.max(0, Math.min(100, ((nowMs - start) / totalSpan) * 100));

  const hoursRemaining = msRemaining / 3600000;
  const level: GoalCountdown["level"] = overdue ? "overdue" : hoursRemaining <= 6 ? "urgent" : "normal";

  const { value, unit } = roundedUnit(absMs);
  const pillLabel = overdue ? "OVERDUE" : `${value}${unit.toUpperCase()} LEFT`;

  let longLabel: string;
  if (overdue) {
    longLabel = absMs < 86400000 ? `Overdue ${roundedUnit(absMs).value}${roundedUnit(absMs).unit}` : `Overdue ${Math.floor(absMs / 86400000)}d`;
  } else if (absMs < 3600000) {
    const mins = Math.floor(absMs / 60000);
    const secs = Math.floor((absMs % 60000) / 1000);
    longLabel = `${mins}m ${secs}s left`;
  } else {
    longLabel = `${value}${unit} left`;
  }

  return { level, pillLabel, longLabel, timePct };
}
