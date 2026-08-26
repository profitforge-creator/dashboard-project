"use client";

import { Check, Edit2, Trash2, Target } from "lucide-react";
import type { Task } from "@/lib/supabase/types";
import { cn, formatTime12h } from "@/lib/utils";

interface TaskRowProps {
  task: Task;
  goalTitle?: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TaskRow({ task, goalTitle, onToggle, onEdit, onDelete }: TaskRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <button
        onClick={onToggle}
        aria-label="Toggle complete"
        className={cn(
          "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          task.completed ? "border-blue bg-blue" : "border-border-strong hover:border-blue"
        )}
      >
        {task.completed && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[15px] font-medium text-text", task.completed && "text-text-secondary line-through")}>
          {task.title}
        </p>
        {goalTitle && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-blue-light">
            <Target className="h-3 w-3 flex-shrink-0" strokeWidth={2} />
            {goalTitle}
          </p>
        )}
      </div>

      <span className="flex-shrink-0 font-mono text-xs text-text-secondary">
        {task.task_time ? formatTime12h(task.task_time) : "Anytime"}
      </span>

      <div className="flex flex-shrink-0 items-center gap-0.5">
        <button onClick={onEdit} aria-label="Edit task" className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-card-secondary hover:text-text">
          <Edit2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button onClick={onDelete} aria-label="Delete task" className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-error/10 hover:text-error">
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
