"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  href: string;
  icon: LucideIcon;
  label: string;
  stat: string;
  sub: string;
  accent?: "blue" | "warning" | "error" | "violet" | "muted";
}

const ACCENT_CLASS: Record<NonNullable<ModuleCardProps["accent"]>, string> = {
  blue: "bg-blue/15 text-blue-light",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/15 text-error",
  violet: "bg-violet/15 text-violet",
  muted: "bg-card-secondary text-text-secondary",
};

export function ModuleCard({ href, icon: Icon, label, stat, sub, accent = "blue" }: ModuleCardProps) {
  return (
    <Link
      href={href}
      className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border-strong"
    >
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", ACCENT_CLASS[accent])}>
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="mt-3">
        <p className="label-mono text-text-secondary">{label}</p>
        <p className="mt-1 text-xl font-semibold text-text">{stat}</p>
        <p className="text-xs text-text-secondary">{sub}</p>
      </div>
    </Link>
  );
}
