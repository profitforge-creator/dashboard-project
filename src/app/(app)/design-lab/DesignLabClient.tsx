"use client";

import { useState } from "react";
import { Instrument_Serif, Space_Grotesk, Fraunces } from "next/font/google";
import { Send, Sparkles, Play, Heart, Zap } from "lucide-react";
import { AvatarOrb, type OrbState } from "@/components/AvatarOrb";

const editorialFont = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic" });
const premiumFont = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"] });
const organicFont = Fraunces({ subsets: ["latin"], weight: ["500", "700"], style: ["normal", "italic"] });

type ThemeKey = "editorial" | "premium" | "organic";

interface Theme {
  label: string;
  tagline: string;
  bg: string;
  card: string;
  cardBorder: string;
  cardBlur?: boolean;
  text: string;
  textSecondary: string;
  accent: string;
  accent2: string;
  radius: string;
  headingFont: string;
  headingItalic: boolean;
}

const THEMES: Record<ThemeKey, Theme> = {
  editorial: {
    label: "Editorial",
    tagline: "Warm, serif-accented, feels hand-designed rather than templated.",
    bg: "#0a0806",
    card: "#16120b",
    cardBorder: "rgba(240,222,198,0.12)",
    text: "#f6ede0",
    textSecondary: "#a99a82",
    accent: "#e0a458",
    accent2: "#c97b63",
    radius: "1.25rem",
    headingFont: editorialFont.className,
    headingItalic: true,
  },
  premium: {
    label: "Premium",
    tagline: "Glassy, tactile, geometric type — feels expensive and native.",
    bg: "#05070a",
    card: "rgba(255,255,255,0.045)",
    cardBorder: "rgba(255,255,255,0.12)",
    cardBlur: true,
    text: "#edf1ff",
    textSecondary: "#8c93ab",
    accent: "#7c9eff",
    accent2: "#63e6d4",
    radius: "1.5rem",
    headingFont: premiumFont.className,
    headingItalic: false,
  },
  organic: {
    label: "Organic",
    tagline: "Bold, colorful, asymmetric — feels alive rather than gridded.",
    bg: "#0d0716",
    card: "#1b1129",
    cardBorder: "rgba(216,180,254,0.16)",
    text: "#f5eaff",
    textSecondary: "#b39ddb",
    accent: "#c084fc",
    accent2: "#22d3ee",
    radius: "2rem",
    headingFont: organicFont.className,
    headingItalic: false,
  },
};

type ChatMessage = { role: "user" | "assistant"; content: string };

export function DesignLabClient() {
  const [themeKey, setThemeKey] = useState<ThemeKey>("editorial");
  const t = THEMES[themeKey];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [demoAnimKey, setDemoAnimKey] = useState(0);

  async function send() {
    const text = input.trim();
    if (!text) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setOrbState("thinking");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages.slice(-8) }),
      });
      const data = await res.json();
      setOrbState("speaking");
      setMessages((m) => [...m, { role: "assistant", content: data.text ?? "…" }]);
      setTimeout(() => setOrbState("idle"), 2200);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Couldn't reach Amari just now." }]);
      setOrbState("idle");
    }
  }

  return (
    <div style={{ background: t.bg, color: t.text, minHeight: "100%" }} className="-m-4 space-y-8 p-4 transition-colors duration-500 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: t.textSecondary }}>
          Amari · Design Lab
        </p>
        <h1 className={t.headingFont} style={{ fontSize: "2.5rem", fontWeight: t.headingItalic ? 400 : 700 }}>
          Try on a direction
        </h1>
        <p className="max-w-xl text-sm" style={{ color: t.textSecondary }}>
          Nothing here touches the real app yet — this is purely to react to. Switch directions, talk to the avatar, tell me what to keep.
        </p>
      </header>

      {/* Theme switcher */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
          const opt = THEMES[key];
          const active = key === themeKey;
          return (
            <button
              key={key}
              onClick={() => setThemeKey(key)}
              className="rounded-2xl border p-4 text-left transition-all"
              style={{
                borderColor: active ? opt.accent : t.cardBorder,
                background: active ? `${opt.accent}1a` : t.card,
                borderWidth: active ? 2 : 1,
              }}
            >
              <div className="mb-2 flex gap-1.5">
                <span className="h-4 w-4 rounded-full" style={{ background: opt.accent }} />
                <span className="h-4 w-4 rounded-full" style={{ background: opt.accent2 }} />
              </div>
              <p className={opt.headingFont} style={{ fontSize: "1.1rem", color: t.text }}>
                {opt.label}
              </p>
              <p className="mt-1 text-xs" style={{ color: t.textSecondary }}>
                {opt.tagline}
              </p>
            </button>
          );
        })}
      </div>

      {/* Avatar + real chat demo */}
      <section
        className="rounded-3xl border p-6"
        style={{ background: t.card, borderColor: t.cardBorder, borderRadius: t.radius, backdropFilter: t.cardBlur ? "blur(20px)" : undefined }}
      >
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: t.textSecondary }}>
          Meet Amari — this box actually talks, using your real goals &amp; tasks
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2">
            <AvatarOrb state={orbState} size={100} colorA={t.accent} colorB={t.accent2} colorC={t.bg} />
            <div className="flex gap-1.5">
              {(["idle", "thinking", "speaking"] as OrbState[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setOrbState(s)}
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors"
                  style={{ background: orbState === s ? t.accent : "transparent", color: orbState === s ? t.bg : t.textSecondary, border: `1px solid ${t.cardBorder}` }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-3 flex max-h-64 flex-col gap-2.5 overflow-y-auto">
              {messages.length === 0 && (
                <p className="text-sm italic" style={{ color: t.textSecondary }}>
                  Try: &ldquo;What is one of my goals, and how can I hit it?&rdquo;
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                    style={m.role === "user" ? { background: t.accent, color: t.bg } : { background: `${t.text}12`, color: t.text }}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Say hello…"
                className="min-h-11 flex-1 rounded-xl px-3.5 text-sm outline-none"
                style={{ background: `${t.text}0d`, color: t.text, border: `1px solid ${t.cardBorder}` }}
              />
              <button
                onClick={send}
                aria-label="Send"
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ background: t.accent, color: t.bg }}
              >
                <Send className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Typography */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: t.textSecondary }}>
          Typography
        </p>
        <div className="rounded-3xl border p-6" style={{ background: t.card, borderColor: t.cardBorder, borderRadius: t.radius }}>
          <p className={t.headingFont} style={{ fontSize: "2.75rem", lineHeight: 1.1, fontWeight: t.headingItalic ? 400 : 700 }}>
            Good evening, Tibby
          </p>
          <p className="mt-1 text-sm" style={{ color: t.textSecondary }}>
            Wednesday, August 27 · Life score 62
          </p>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed">
            Body text sits in Inter regardless of direction — only headings change character. This keeps everything readable while the personality shows up where it counts.
          </p>
        </div>
      </section>

      {/* Color palette */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: t.textSecondary }}>
          Palette
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Background", hex: t.bg },
            { label: "Surface", hex: t.card },
            { label: "Accent", hex: t.accent },
            { label: "Accent 2", hex: t.accent2 },
          ].map((sw) => (
            <div key={sw.label} className="overflow-hidden rounded-2xl border" style={{ borderColor: t.cardBorder }}>
              <div className="h-16" style={{ background: sw.hex }} />
              <div className="p-3" style={{ background: t.card }}>
                <p className="text-xs font-medium">{sw.label}</p>
                <p className="text-[11px]" style={{ color: t.textSecondary }}>
                  {sw.hex}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Buttons */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: t.textSecondary }}>
          Buttons
        </p>
        <div className="flex flex-wrap items-center gap-3 rounded-3xl border p-6" style={{ background: t.card, borderColor: t.cardBorder, borderRadius: t.radius }}>
          <button className="min-h-11 rounded-xl px-5 text-sm font-semibold transition-transform active:scale-95" style={{ background: t.accent, color: t.bg }}>
            Primary
          </button>
          <button
            className="min-h-11 rounded-xl border px-5 text-sm font-semibold transition-transform active:scale-95"
            style={{ borderColor: t.cardBorder, color: t.text, background: "transparent" }}
          >
            Secondary
          </button>
          <button
            className="min-h-11 rounded-full px-5 text-sm font-semibold uppercase tracking-wide transition-transform active:scale-95"
            style={{ border: `1px solid ${t.accent}`, color: t.accent }}
          >
            Pill
          </button>
          <button className="flex min-h-11 items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70" style={{ color: t.accent }}>
            <Sparkles className="h-4 w-4" strokeWidth={2} /> Link
          </button>
        </div>
      </section>

      {/* Cards */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: t.textSecondary }}>
          Cards
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: Heart, label: "Health", value: "82%" },
            { icon: Zap, label: "Focus streak", value: "6 days" },
            { icon: Sparkles, label: "Goals on track", value: "3/4" },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border p-4 transition-transform hover:-translate-y-0.5"
              style={{ background: t.card, borderColor: t.cardBorder, borderRadius: t.radius, backdropFilter: t.cardBlur ? "blur(20px)" : undefined }}
            >
              <c.icon className="mb-2 h-4 w-4" strokeWidth={2} style={{ color: t.accent }} />
              <p className="text-xs" style={{ color: t.textSecondary }}>
                {c.label}
              </p>
              <p className={t.headingFont} style={{ fontSize: "1.5rem" }}>
                {c.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Motion */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: t.textSecondary }}>
          Motion
        </p>
        <div className="flex flex-wrap items-center gap-4 rounded-3xl border p-6" style={{ background: t.card, borderColor: t.cardBorder, borderRadius: t.radius }}>
          <button
            key={demoAnimKey}
            onClick={() => setDemoAnimKey((k) => k + 1)}
            className="animate-fade-in flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold"
            style={{ background: t.accent, color: t.bg }}
          >
            <Play className="h-4 w-4" strokeWidth={2} /> Replay entrance
          </button>
          <div className="h-11 w-32 animate-pulse rounded-xl" style={{ background: `${t.text}14` }} />
          <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: `${t.accent}22` }}>
            <span className="animate-pulse-glow h-2.5 w-2.5 rounded-full" style={{ background: t.accent }} />
          </div>
          <p className="text-xs" style={{ color: t.textSecondary }}>
            Hover the cards above for lift, press any button for a tap-scale.
          </p>
        </div>
      </section>
    </div>
  );
}
