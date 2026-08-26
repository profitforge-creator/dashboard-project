"use client";

import Link from "next/link";
import { ProgressRing } from "@/components/ProgressRing";
import { cn } from "@/lib/utils";

type Accent = "blue" | "success" | "warning" | "error";

const ACCENT_COLOR: Record<Accent, string> = {
  blue: "var(--color-blue-light)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error: "var(--color-error)",
};

interface StatPillButtonProps {
  value: string;
  label: string;
  progress: number;
  accent?: Accent;
  href?: string;
  onClick?: () => void;
  className?: string;
}

/** The design lab's dark glossy pill + circular-progress stat, used as an interactive button/shortcut. */
export function StatPillButton({ value, label, progress, accent = "blue", href, onClick, className }: StatPillButtonProps) {
  const content = (
    <>
      <ProgressRing value={progress} size={44} stroke={4} color={ACCENT_COLOR[accent]}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT_COLOR[accent], boxShadow: `0 0 8px ${ACCENT_COLOR[accent]}` }} />
      </ProgressRing>
      <div className="min-w-0 text-left">
        <p className="truncate text-lg font-bold leading-tight text-text">{value}</p>
        <p className="truncate text-xs text-text-secondary">{label}</p>
      </div>
    </>
  );

  const classes = cn(
    "inline-flex min-h-16 items-center gap-3 rounded-full border border-border-strong bg-card-secondary px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-colors hover:border-border-strong hover:bg-card",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}
