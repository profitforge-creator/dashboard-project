"use client";

import { useEffect, useState } from "react";

interface AmariLifeCircleProps {
  score: number; // 0-100
  size?: number;
}

/**
 * The ambient "Life Circle" — restrained glow whose luminosity tracks
 * the Life Score, with a slow rotating gradient. Fully paused under
 * prefers-reduced-motion via the global stylesheet rule.
 */
export function AmariLifeCircle({ score, size = 240 }: AmariLifeCircleProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const clamped = Math.max(0, Math.min(100, score));
  const glowOpacity = 0.25 + (clamped / 100) * 0.55;
  const glowBlur = 40 + (clamped / 100) * 40;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full transition-opacity duration-1000"
        style={{
          background: "radial-gradient(circle, var(--color-blue-light) 0%, var(--color-blue) 45%, transparent 72%)",
          filter: `blur(${glowBlur}px)`,
          opacity: mounted ? glowOpacity : 0,
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-6 rounded-full border border-white/10 motion-safe:animate-[spin_40s_linear_infinite]"
        style={{
          background: "conic-gradient(from 0deg, rgba(127,245,196,0.25), transparent 30%, rgba(52,227,161,0.35) 60%, transparent 90%)",
        }}
        aria-hidden="true"
      />
      <div
        className="relative flex h-[68%] w-[68%] flex-col items-center justify-center rounded-full border border-white/10 bg-bg-raised/80 text-center shadow-[0_0_60px_-10px_rgba(52,227,161,0.5)] backdrop-blur-sm"
      >
        <span className="text-5xl font-semibold tabular-nums text-text">{Math.round(clamped)}</span>
        <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-text-secondary">Life Score</span>
      </div>
    </div>
  );
}
