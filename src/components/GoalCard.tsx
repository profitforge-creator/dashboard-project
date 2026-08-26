"use client";

import { useState } from "react";
import { Edit2, Trash2, CalendarPlus, Sparkles } from "lucide-react";
import type { Goal } from "@/lib/supabase/types";
import { ProgressRing } from "@/components/ProgressRing";
import { cn, deadlineInfo } from "@/lib/utils";

const CATEGORY_LABEL: Record<Goal["category"], string> = {
  health: "Health",
  business: "Business",
  financial: "Financial",
  spiritual: "Spiritual",
  general: "General",
};

const PRIORITY_LABEL: Record<Goal["priority"], string> = { low: "Low", medium: "Medium", high: "High" };

interface GoalCardProps {
  goal: Goal;
  progressPct: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: () => void;
  onAddToCalendar: () => void;
  onAskAmari: () => void;
}

export function GoalCard({ goal, progressPct, onEdit, onDelete, onToggleComplete, onAddToCalendar, onAskAmari }: GoalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const dl = deadlineInfo(goal.deadline);

  const levelColor =
    dl?.level === "overdue" ? "text-error" : dl?.level === "urgent" ? "text-warning" : dl?.level === "soon" ? "text-blue-light" : "text-success";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 transition-colors",
        goal.status === "completed" && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <ProgressRing value={progressPct} size={48} stroke={4}>
          <span className="text-[11px] font-semibold text-text">{progressPct}%</span>
        </ProgressRing>

        <button className="min-w-0 flex-1 text-left" onClick={() => setExpanded((v) => !v)}>
          <div className="flex items-center gap-2">
            <h3 className={cn("truncate text-[15px] font-semibold text-text", goal.status === "completed" && "line-through")}>
              {goal.title}
            </h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
            <span className="rounded-full bg-card-secondary px-2 py-0.5">{CATEGORY_LABEL[goal.category]}</span>
            <span className="rounded-full bg-card-secondary px-2 py-0.5">{PRIORITY_LABEL[goal.priority]} priority</span>
            {dl && <span className={cn("font-semibold", levelColor)}>{dl.label}</span>}
          </div>
        </button>

        <div className="flex items-center gap-1">
          <button onClick={onEdit} aria-label="Edit goal" className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-card-secondary hover:text-text">
            <Edit2 className="h-4 w-4" strokeWidth={2} />
          </button>
          <button onClick={onDelete} aria-label="Delete goal" className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-error/10 hover:text-error">
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 animate-fade-in border-t border-border pt-4">
          {goal.description && <p className="mb-3 text-sm leading-relaxed text-text-secondary">{goal.description}</p>}
          {goal.next_action && (
            <p className="mb-3 text-sm text-text">
              <span className="font-medium text-text-secondary">Next action: </span>
              {goal.next_action}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onToggleComplete}
              className="min-h-9 rounded-full border border-border px-3.5 text-sm font-medium text-text transition-colors hover:bg-card-secondary"
            >
              {goal.status === "completed" ? "Mark active" : "Mark complete"}
            </button>
            <button
              onClick={onAddToCalendar}
              className="flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-medium text-text transition-colors hover:bg-card-secondary"
            >
              <CalendarPlus className="h-3.5 w-3.5" strokeWidth={2} />
              Add to calendar
            </button>
            <button
              onClick={onAskAmari}
              className="flex min-h-9 items-center gap-1.5 rounded-full border border-blue/40 bg-blue/10 px-3.5 text-sm font-medium text-blue-light transition-colors hover:bg-blue/20"
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              Ask Amari
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
