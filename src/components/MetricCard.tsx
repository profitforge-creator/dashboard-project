"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  format?: (n: number) => string;
  className?: string;
}

export function MetricCard({ icon: Icon, label, value, suffix = "", format, className }: MetricCardProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 600;
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <div className="flex items-center gap-1.5 text-text-secondary">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-text">
        {format ? format(display) : display}
        {suffix}
      </p>
    </div>
  );
}
