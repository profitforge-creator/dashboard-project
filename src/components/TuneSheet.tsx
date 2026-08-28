"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Weight, Layers, Repeat2, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WorkoutExercise } from "@/lib/supabase/types";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/Button";

interface TuneSheetProps {
  open: boolean;
  onClose: () => void;
  exercise: WorkoutExercise | null;
  dayLabel: string;
  onSave: (id: string, updates: { weight_lb: number | null; sets: number | null; reps: string; rest_seconds: number | null }) => void;
}

function clamp(n: number, min: number) {
  return Math.max(min, n);
}

function formatRest(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StepperRow({
  icon: Icon,
  label,
  value,
  onDecrement,
  onIncrement,
  unit,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3.5 last:border-0">
      <span className="label-mono flex items-center gap-1.5 text-text-secondary">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} /> {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDecrement}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:border-border-strong hover:text-text"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
        <span className="min-w-[64px] text-center text-lg font-semibold tabular-nums text-text">
          {value}
          {unit && <span className="ml-1 text-xs font-normal text-text-secondary">{unit}</span>}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          aria-label={`Increase ${label.toLowerCase()}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:border-border-strong hover:text-text"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

export function TuneSheet({ open, onClose, exercise, dayLabel, onSave }: TuneSheetProps) {
  const [weight, setWeight] = useState(0);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [rest, setRest] = useState(90);

  useEffect(() => {
    if (!exercise) return;
    setWeight(exercise.weight_lb ?? 0);
    setSets(exercise.sets ?? 3);
    setReps(Number(exercise.reps) || 10);
    setRest(exercise.rest_seconds ?? 90);
  }, [exercise]);

  if (!exercise) return null;

  function save() {
    if (!exercise) return;
    onSave(exercise.id, { weight_lb: weight || null, sets, reps: String(reps), rest_seconds: rest });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={exercise.name}>
      <p className="label-mono -mt-2 mb-4 text-blue-light">
        Tune · {dayLabel}
      </p>

      <div className="rounded-2xl border border-border bg-bg px-4">
        <StepperRow icon={Weight} label="Weight" value={String(weight)} unit="lb" onDecrement={() => setWeight((w) => clamp(w - 5, 0))} onIncrement={() => setWeight((w) => w + 5)} />
        <StepperRow icon={Layers} label="Sets" value={String(sets)} onDecrement={() => setSets((v) => clamp(v - 1, 1))} onIncrement={() => setSets((v) => v + 1)} />
        <StepperRow icon={Repeat2} label="Reps" value={String(reps)} onDecrement={() => setReps((v) => clamp(v - 1, 1))} onIncrement={() => setReps((v) => v + 1)} />
        <StepperRow icon={Clock} label="Rest" value={formatRest(rest)} onDecrement={() => setRest((v) => clamp(v - 15, 15))} onIncrement={() => setRest((v) => v + 15)} />
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="ghost" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button onClick={save} className="flex-1">
          Save
        </Button>
      </div>
    </Sheet>
  );
}
