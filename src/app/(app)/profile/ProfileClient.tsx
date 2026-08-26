"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  Download,
  Flame,
  Globe,
  Heart,
  LogOut,
  Mic,
  Moon,
  Palette,
  Shield,
  Sparkles,
  Trash2,
  Trophy,
  Wallet,
  Wand2,
} from "lucide-react";
import type { Profile, IntegrationConnection, CoachingPersonality, Appearance } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmationDialog";
import { MetricCard } from "@/components/MetricCard";

interface ProfileClientProps {
  profile: Profile;
  integrations: IntegrationConnection[];
  completedGoals: number;
  totalFocusMinutes: number;
  userEmail: string;
}

const PERSONALITIES: { value: CoachingPersonality; label: string }[] = [
  { value: "direct", label: "Direct" },
  { value: "encouraging", label: "Encouraging" },
  { value: "calm", label: "Calm" },
  { value: "tough_love", label: "Tough love" },
];

const INTEGRATION_META = {
  google_calendar: { label: "Google Calendar", icon: Calendar, envHint: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET" },
  ai_voice: { label: "AI Voice", icon: Mic, envHint: "a voice provider API key" },
  crypto_wallet: { label: "Crypto Wallet", icon: Wallet, envHint: "a WalletConnect project ID" },
  financial: { label: "Financial Accounts", icon: Heart, envHint: "a Plaid client ID/secret" },
} as const;

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{title}</h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">{children}</div>
    </section>
  );
}

function Row({ icon: Icon, label, control }: { icon: React.ElementType; label: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 flex-shrink-0 text-text-secondary" strokeWidth={2} />
        <span className="text-sm font-medium text-text">{label}</span>
      </div>
      {control}
    </div>
  );
}

export function ProfileClient({ profile: initialProfile, integrations, completedGoals, totalFocusMinutes, userEmail }: ProfileClientProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);

  async function update(patch: Partial<Profile>) {
    setSaving(true);
    setProfile((p) => ({ ...p, ...patch }));
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
    setSaving(false);
    if (error) toast("Could not save that change.", "error");
  }

  function integrationFor(provider: keyof typeof INTEGRATION_META) {
    return integrations.find((i) => i.provider === provider);
  }

  async function connectIntegration(provider: keyof typeof INTEGRATION_META) {
    toast(`Not connected yet — ask me to wire up ${INTEGRATION_META[provider].envHint} and I'll finish this.`);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function exportData() {
    const supabase = createClient();
    const [goals, tasks, sessions, habits, habitLogs] = await Promise.all([
      supabase.from("goals").select("*").eq("user_id", profile.id),
      supabase.from("tasks").select("*").eq("user_id", profile.id),
      supabase.from("focus_sessions").select("*").eq("user_id", profile.id),
      supabase.from("habits").select("*").eq("user_id", profile.id),
      supabase.from("habit_logs").select("*").eq("user_id", profile.id),
    ]);
    const payload = {
      profile,
      goals: goals.data,
      tasks: tasks.data,
      focus_sessions: sessions.data,
      habits: habits.data,
      habit_logs: habitLogs.data,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `amari-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Export downloaded");
  }

  async function deleteAllData() {
    const ok = await confirm({
      title: "Delete all your data?",
      description: "This permanently removes every goal, task, session, and habit. Your account stays signed in.",
      confirmLabel: "Delete everything",
      danger: true,
    });
    if (!ok) return;
    const supabase = createClient();
    await Promise.all([
      supabase.from("goals").delete().eq("user_id", profile.id),
      supabase.from("tasks").delete().eq("user_id", profile.id),
      supabase.from("focus_sessions").delete().eq("user_id", profile.id),
      supabase.from("habits").delete().eq("user_id", profile.id),
      supabase.from("onboarding_responses").delete().eq("user_id", profile.id),
    ]);
    await supabase.from("profiles").update({ onboarding_completed: false }).eq("id", profile.id);
    toast("All data deleted");
    router.push("/onboarding");
    router.refresh();
  }

  const displayName = profile.full_name || userEmail.split("@")[0];

  return (
    <div className="animate-fade-in space-y-6 pb-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card text-xl font-semibold text-text">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="text-lg font-semibold text-text">{displayName}</p>
          <p className="text-sm text-text-secondary">{userEmail}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard icon={Flame} label="Streak" value={profile.streak_count} suffix="d" />
        <MetricCard icon={Trophy} label="Level" value={profile.level} />
        <MetricCard icon={Sparkles} label="Focus" value={totalFocusMinutes} suffix="m" />
      </div>
      <p className="-mt-3 text-center text-xs text-text-secondary">{completedGoals} goals completed all-time</p>

      <SettingsSection title="Amari">
        <Row
          icon={Wand2}
          label="Coaching personality"
          control={
            <select
              value={profile.coaching_personality}
              onChange={(e) => update({ coaching_personality: e.target.value as CoachingPersonality })}
              className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-blue"
            >
              {PERSONALITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          }
        />
        <Row
          icon={Sparkles}
          label="Wake phrase"
          control={
            <input
              defaultValue={profile.wake_phrase}
              onBlur={(e) => e.target.value !== profile.wake_phrase && update({ wake_phrase: e.target.value })}
              className="w-32 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-right text-sm text-text outline-none focus:border-blue"
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="Preferences">
        <Row
          icon={Bell}
          label="Notifications"
          control={
            <Toggle checked={profile.notifications_enabled} onChange={(v) => update({ notifications_enabled: v })} />
          }
        />
        <Row
          icon={Palette}
          label="Appearance"
          control={
            <select
              value={profile.appearance}
              onChange={(e) => update({ appearance: e.target.value as Appearance })}
              className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-blue"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          }
        />
        <Row
          icon={Globe}
          label="Timezone"
          control={
            <input
              defaultValue={profile.timezone}
              onBlur={(e) => e.target.value !== profile.timezone && update({ timezone: e.target.value })}
              className="w-40 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-right text-sm text-text outline-none focus:border-blue"
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="Integrations">
        {(Object.keys(INTEGRATION_META) as (keyof typeof INTEGRATION_META)[]).map((key) => {
          const meta = INTEGRATION_META[key];
          const conn = integrationFor(key);
          const connected = conn?.status === "connected";
          return (
            <Row
              key={key}
              icon={meta.icon}
              label={meta.label}
              control={
                <button
                  onClick={() => connectIntegration(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    connected ? "bg-success/15 text-success" : "border border-border text-text-secondary hover:text-text"
                  }`}
                >
                  {connected ? "Connected" : "Connect"}
                </button>
              }
            />
          );
        })}
      </SettingsSection>

      <SettingsSection title="Privacy & data">
        <Row icon={Shield} label="Privacy controls" control={<span className="text-xs text-text-secondary">Your data, only you</span>} />
        <Row icon={Moon} label="Memory controls" control={<span className="text-xs text-text-secondary">Chat context only</span>} />
        <Row
          icon={Download}
          label="Export my data"
          control={
            <button onClick={exportData} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text">
              Export
            </button>
          }
        />
        <Row
          icon={Trash2}
          label="Delete all data"
          control={
            <button onClick={deleteAllData} className="rounded-full border border-error/40 px-3 py-1.5 text-xs font-semibold text-error">
              Delete
            </button>
          }
        />
      </SettingsSection>

      <button
        onClick={signOut}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-text transition-colors hover:bg-card"
      >
        <LogOut className="h-4 w-4" strokeWidth={2} /> Sign out
      </button>

      {saving && <p className="text-center text-xs text-text-secondary">Saving…</p>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${checked ? "bg-blue" : "bg-border-strong"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
      />
    </button>
  );
}
