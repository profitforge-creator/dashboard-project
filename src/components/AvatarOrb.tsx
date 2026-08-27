"use client";

export type OrbState = "idle" | "thinking" | "speaking";

interface AvatarOrbProps {
  state?: OrbState;
  size?: number;
  colorA?: string;
  colorB?: string;
  colorC?: string;
}

const SPEED: Record<OrbState, { rotate: number; rotateRev: number; breathe: number; drift: number }> = {
  idle: { rotate: 14, rotateRev: 18, breathe: 3.4, drift: 8 },
  thinking: { rotate: 6, rotateRev: 8, breathe: 1.6, drift: 4 },
  speaking: { rotate: 3, rotateRev: 4, breathe: 0.7, drift: 2.2 },
};

/** An abstract, animated "living" orb — layered blurred gradient blobs, no external assets. */
export function AvatarOrb({ state = "idle", size = 96, colorA = "#2f6bff", colorB = "#63c7ff", colorC = "#0b2b5a" }: AvatarOrbProps) {
  const speed = SPEED[state];

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Amari avatar, ${state}`}>
      <div
        className="animate-orb-drift absolute inset-[-30%] rounded-full opacity-60 blur-2xl"
        style={{ background: `radial-gradient(circle, ${colorA}66 0%, transparent 70%)`, animationDuration: `${speed.drift}s` }}
      />
      <div
        className="animate-orb-rotate absolute inset-0 rounded-full opacity-90 blur-md"
        style={{
          background: `conic-gradient(from 0deg, ${colorA}, ${colorB}, ${colorC}, ${colorA})`,
          animationDuration: `${speed.rotate}s`,
        }}
      />
      <div
        className="animate-orb-rotate-reverse absolute inset-[12%] rounded-full opacity-80 blur-sm"
        style={{
          background: `conic-gradient(from 90deg, ${colorB}, ${colorA}, ${colorB})`,
          animationDuration: `${speed.rotateRev}s`,
        }}
      />
      <div
        className="animate-orb-breathe absolute inset-[26%] rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 30%, ${colorB}, ${colorA} 65%)`,
          boxShadow: `0 0 ${size * 0.35}px ${colorA}80`,
          animationDuration: `${speed.breathe}s`,
        }}
      />
    </div>
  );
}
