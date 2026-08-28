"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/BrandMark";

export type ModuleVisual = "sparkline" | "particles" | "radar" | "dotmatrix" | "emblem" | "bars";

interface ModuleCardProps {
  href: string;
  icon: LucideIcon;
  index: string;
  label: string;
  stat: string;
  sub: string;
  visual: ModuleVisual;
  accent?: "blue" | "warning" | "error" | "violet" | "muted";
  hero?: boolean;
}

const ACCENT_STROKE: Record<NonNullable<ModuleCardProps["accent"]>, string> = {
  blue: "var(--color-blue)",
  warning: "var(--color-warning)",
  error: "var(--color-error)",
  violet: "var(--color-violet)",
  muted: "var(--color-text-secondary)",
};

const ACCENT_ICON_CLASS: Record<NonNullable<ModuleCardProps["accent"]>, string> = {
  blue: "bg-blue/15 text-blue-light",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/15 text-error",
  violet: "bg-violet/15 text-violet",
  muted: "bg-card-secondary text-text-secondary",
};

function Sparkline({ stroke }: { stroke: string }) {
  return (
    <svg viewBox="0 0 200 70" preserveAspectRatio="none" className="h-full w-full">
      <polyline
        points="0,55 25,50 50,42 75,46 100,30 125,34 150,18 175,22 200,8"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <polyline points="0,55 25,50 50,42 75,46 100,30 125,34 150,18 175,22 200,8 200,70 0,70" fill={stroke} opacity="0.06" stroke="none" />
    </svg>
  );
}

function Particles({ stroke }: { stroke: string }) {
  const dots = [
    [78, 30, 1.6, 0.5],
    [55, 55, 1, 0.3],
    [92, 62, 1.2, 0.35],
    [65, 15, 0.8, 0.25],
    [40, 38, 1, 0.3],
  ];
  return (
    <svg viewBox="0 0 100 70" className="h-full w-full">
      <circle cx="72" cy="35" r="14" fill={stroke} opacity="0.12" />
      <circle cx="72" cy="35" r="6" fill={stroke} opacity="0.4" />
      {dots.map(([cx, cy, r, o], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={stroke} opacity={o} />
      ))}
    </svg>
  );
}

function Radar({ stroke }: { stroke: string }) {
  return (
    <svg viewBox="0 0 100 70" className="h-full w-full">
      <g transform="translate(74,35)" opacity="0.4">
        <circle r="26" fill="none" stroke={stroke} strokeWidth="1" opacity="0.3" />
        <circle r="16" fill="none" stroke={stroke} strokeWidth="1" opacity="0.35" />
        <path d="M0,0 L26,0 A26,26 0 0 0 18,-18 Z" fill={stroke} opacity="0.18" />
        <circle cx="14" cy="-10" r="2" fill={stroke} opacity="0.7" />
      </g>
    </svg>
  );
}

function DotMatrix({ stroke }: { stroke: string }) {
  const cols = 6;
  const rows = 4;
  const cells: [number, number][] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([c, r]);
  const hi = 14;
  return (
    <svg viewBox="0 0 100 70" className="h-full w-full">
      {cells.map(([c, r], i) => (
        <circle key={i} cx={20 + c * 12} cy={12 + r * 15} r={i === hi ? 2.6 : 1.2} fill={stroke} opacity={i === hi ? 0.8 : 0.18} />
      ))}
    </svg>
  );
}

function Emblem() {
  return (
    <div className="flex h-full w-full items-center justify-center opacity-[0.14]">
      <BrandMark size={56} className="text-text" />
    </div>
  );
}

function Bars({ stroke }: { stroke: string }) {
  const heights = [18, 30, 14, 40, 22, 34, 12];
  return (
    <svg viewBox="0 0 100 70" className="h-full w-full">
      {heights.map((h, i) => (
        <rect key={i} x={10 + i * 12} y={60 - h} width="6" height={h} rx="1.5" fill={stroke} opacity={i % 2 === 0 ? 0.5 : 0.22} />
      ))}
    </svg>
  );
}

function VisualBg({ visual, stroke }: { visual: ModuleVisual; stroke: string }) {
  switch (visual) {
    case "sparkline":
      return <Sparkline stroke={stroke} />;
    case "particles":
      return <Particles stroke={stroke} />;
    case "radar":
      return <Radar stroke={stroke} />;
    case "dotmatrix":
      return <DotMatrix stroke={stroke} />;
    case "emblem":
      return <Emblem />;
    case "bars":
      return <Bars stroke={stroke} />;
  }
}

export function ModuleCard({ href, icon: Icon, index, label, stat, sub, visual, accent = "blue", hero = false }: ModuleCardProps) {
  const stroke = ACCENT_STROKE[accent];
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-4 transition-colors hover:border-border-strong",
        hero ? "min-h-[160px]" : "min-h-[132px]"
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <VisualBg visual={visual} stroke={stroke} />
      </div>

      <div className="relative flex items-start justify-between">
        <span className="label-mono text-text-secondary/70">{index}</span>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-full", ACCENT_ICON_CLASS[accent])}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        </span>
      </div>

      <div className="relative">
        <p className={cn("italic text-text", hero ? "text-2xl" : "text-lg")} style={{ fontFamily: "var(--font-serif)" }}>
          {label}
        </p>
        <p className="text-xs text-text-secondary">{sub}</p>
        {stat !== "—" && <p className="mt-0.5 text-xs font-semibold text-text-secondary/90">{stat}</p>}
      </div>
    </Link>
  );
}
