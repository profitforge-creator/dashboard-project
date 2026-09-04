"use client";

import { Layers, Rows3, RefreshCcw, Grid2x2, Star } from "lucide-react";
import type { WorkoutSplit, SplitLevel } from "@/lib/workoutCatalog";
import { cn } from "@/lib/utils";

const LEVEL_LABEL: Record<SplitLevel, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
const LEVEL_CLASS: Record<SplitLevel, string> = {
  beginner: "border-border-strong text-text-secondary",
  intermediate: "border-warning/40 text-warning",
  advanced: "border-error/40 text-error",
};

function splitIcon(split: WorkoutSplit) {
  if (split.pattern.length <= 3 && split.daysPerWeek <= 3 && !split.cycles) return Layers;
  if (split.cycles) return RefreshCcw;
  if (split.pattern.length >= 5) return Grid2x2;
  return Rows3;
}

interface SplitPickerCardProps {
  split: WorkoutSplit;
  active: boolean;
  onClick: () => void;
}

export function SplitPickerCard({ split, active, onClick }: SplitPickerCardProps) {
  const Icon = splitIcon(split);
  const totalDots = split.cycles ? split.pattern.length : Math.max(split.pattern.length, 7);

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 text-left transition-colors",
        active ? "glow-border border-blue/50 bg-blue/5" : "border-border bg-card hover:border-border-strong"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full", active ? "bg-blue/20 text-blue-light" : "bg-card-secondary text-text-secondary")}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="flex flex-col items-end gap-1">
          {split.recommended && (
            <span className="flex items-center gap-1 rounded-full border border-warning/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
              <Star className="h-2.5 w-2.5" strokeWidth={2} fill="currentColor" /> Recommended
            </span>
          )}
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", LEVEL_CLASS[split.level])}>
            {LEVEL_LABEL[split.level]}
          </span>
        </div>
      </div>
      <p className="mt-3 text-lg font-semibold text-text">
        {split.name}
      </p>
      <p className="text-xs text-text-secondary">
        {split.daysPerWeek}x {split.cycles ? "/cycle · rotates" : "/wk"}
      </p>
      <div className="mt-3 flex items-center gap-1.5">
        {Array.from({ length: totalDots }).map((_, i) => (
          <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i < split.pattern.length ? "bg-blue-light" : "bg-card-secondary")} />
        ))}
        {split.cycles && <RefreshCcw className="ml-1 h-3 w-3 text-text-secondary" strokeWidth={2} />}
      </div>
      <p className="mt-1.5 truncate text-[10px] uppercase tracking-wide text-text-secondary">{split.pattern.join(" · ")}</p>
    </button>
  );
}
