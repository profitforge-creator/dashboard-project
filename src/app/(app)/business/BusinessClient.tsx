"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Edit2, Lightbulb, Rocket, Layers, AtSign, Instagram, Youtube, Music2, Globe, Sparkles, TrendingUp } from "lucide-react";
import type {
  BusinessIdea,
  BusinessIdeaStatus,
  BusinessApp,
  BusinessAppStatus,
  BusinessModel,
  BusinessModelStatus,
  SocialAccount,
  SocialPlatform,
  SocialMetricsLog,
} from "@/lib/supabase/types";
import { MetricCard } from "@/components/MetricCard";
import { SegmentedControl } from "@/components/SegmentedControl";
import { EmptyState } from "@/components/EmptyState";
import { ProgressRing } from "@/components/ProgressRing";
import { AreaChart } from "@/components/AreaChart";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/Button";
import { ChatSheet } from "@/components/ChatSheet";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmationDialog";
import { todayISO } from "@/lib/utils";

interface BusinessClientProps {
  ideas: BusinessIdea[];
  apps: BusinessApp[];
  models: BusinessModel[];
  accounts: SocialAccount[];
  metrics: SocialMetricsLog[];
}

type Tab = "overview" | "ideas" | "apps" | "social" | "models";

const IDEA_STATUS_LABEL: Record<BusinessIdeaStatus, string> = {
  idea: "Idea",
  validating: "Validating",
  building: "Building",
  shipped: "Shipped",
  archived: "Archived",
};
const APP_STATUS_LABEL: Record<BusinessAppStatus, string> = { in_progress: "In progress", shipped: "Shipped", paused: "Paused" };
const MODEL_STATUS_LABEL: Record<BusinessModelStatus, string> = { active: "Active", paused: "Paused", archived: "Archived" };
const PLATFORM_LABEL: Record<SocialPlatform, string> = { x: "X", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", other: "Other" };
const PLATFORM_ICON: Record<SocialPlatform, typeof AtSign> = { x: AtSign, instagram: Instagram, tiktok: Music2, youtube: Youtube, other: Globe };

function currency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}
function dateLabel(iso: string) {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function BusinessClient({ ideas, apps, models, accounts, metrics }: BusinessClientProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("overview");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState<string | undefined>(undefined);

  function askAmari(text: string) {
    setChatMessage(text);
    setChatOpen(true);
  }

  // ---- Ideas ----
  const [ideaSheetOpen, setIdeaSheetOpen] = useState(false);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [ideaForm, setIdeaForm] = useState({ title: "", description: "", status: "idea" as BusinessIdeaStatus });

  function openNewIdea() {
    setEditingIdeaId(null);
    setIdeaForm({ title: "", description: "", status: "idea" });
    setIdeaSheetOpen(true);
  }
  function openEditIdea(idea: BusinessIdea) {
    setEditingIdeaId(idea.id);
    setIdeaForm({ title: idea.title, description: idea.description, status: idea.status });
    setIdeaSheetOpen(true);
  }
  async function saveIdea(e: React.FormEvent) {
    e.preventDefault();
    if (!ideaForm.title.trim()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { title: ideaForm.title.trim(), description: ideaForm.description.trim(), status: ideaForm.status };
    const { error } = editingIdeaId
      ? await supabase.from("business_ideas").update(payload).eq("id", editingIdeaId)
      : await supabase.from("business_ideas").insert({ ...payload, user_id: user.id });
    if (error) {
      toast("Couldn't save idea.", "error");
      return;
    }
    toast(editingIdeaId ? "Idea updated." : "Idea added.", "success");
    setIdeaSheetOpen(false);
    router.refresh();
  }
  async function deleteIdea(id: string) {
    const ok = await confirm({ title: "Delete this idea?", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    const supabase = createClient();
    await supabase.from("business_ideas").delete().eq("id", id);
    toast("Idea deleted.", "success");
    router.refresh();
  }

  // ---- Apps ----
  const [appSheetOpen, setAppSheetOpen] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [appForm, setAppForm] = useState({ name: "", description: "", completion_pct: "0", status: "in_progress" as BusinessAppStatus, notes: "" });

  function openNewApp() {
    setEditingAppId(null);
    setAppForm({ name: "", description: "", completion_pct: "0", status: "in_progress", notes: "" });
    setAppSheetOpen(true);
  }
  function openEditApp(app: BusinessApp) {
    setEditingAppId(app.id);
    setAppForm({ name: app.name, description: app.description, completion_pct: app.completion_pct.toString(), status: app.status, notes: app.notes });
    setAppSheetOpen(true);
  }
  async function saveApp(e: React.FormEvent) {
    e.preventDefault();
    if (!appForm.name.trim()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      name: appForm.name.trim(),
      description: appForm.description.trim(),
      completion_pct: Math.max(0, Math.min(100, Number(appForm.completion_pct) || 0)),
      status: appForm.status,
      notes: appForm.notes.trim(),
    };
    const { error } = editingAppId
      ? await supabase.from("business_apps").update(payload).eq("id", editingAppId)
      : await supabase.from("business_apps").insert({ ...payload, user_id: user.id });
    if (error) {
      toast("Couldn't save app.", "error");
      return;
    }
    toast(editingAppId ? "App updated." : "App added.", "success");
    setAppSheetOpen(false);
    router.refresh();
  }
  async function deleteApp(id: string) {
    const ok = await confirm({ title: "Delete this app?", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    const supabase = createClient();
    await supabase.from("business_apps").delete().eq("id", id);
    toast("App deleted.", "success");
    router.refresh();
  }

  // ---- Models ----
  const [modelSheetOpen, setModelSheetOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [modelForm, setModelForm] = useState({ name: "", description: "", revenue_model: "", status: "active" as BusinessModelStatus });

  function openNewModel() {
    setEditingModelId(null);
    setModelForm({ name: "", description: "", revenue_model: "", status: "active" });
    setModelSheetOpen(true);
  }
  function openEditModel(model: BusinessModel) {
    setEditingModelId(model.id);
    setModelForm({ name: model.name, description: model.description, revenue_model: model.revenue_model, status: model.status });
    setModelSheetOpen(true);
  }
  async function saveModel(e: React.FormEvent) {
    e.preventDefault();
    if (!modelForm.name.trim()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { name: modelForm.name.trim(), description: modelForm.description.trim(), revenue_model: modelForm.revenue_model.trim(), status: modelForm.status };
    const { error } = editingModelId
      ? await supabase.from("business_models").update(payload).eq("id", editingModelId)
      : await supabase.from("business_models").insert({ ...payload, user_id: user.id });
    if (error) {
      toast("Couldn't save business model.", "error");
      return;
    }
    toast(editingModelId ? "Model updated." : "Model added.", "success");
    setModelSheetOpen(false);
    router.refresh();
  }
  async function deleteModel(id: string) {
    const ok = await confirm({ title: "Delete this business model?", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    const supabase = createClient();
    await supabase.from("business_models").delete().eq("id", id);
    toast("Model deleted.", "success");
    router.refresh();
  }
  function askAmariAboutModel(model: BusinessModel) {
    const related = ideas
      .filter((i) => i.status !== "archived")
      .map((i) => i.title)
      .slice(0, 5);
    const relatedApps = apps.map((a) => `${a.name} (${a.completion_pct}% done)`).slice(0, 5);
    askAmari(
      `Here's one of my business models — "${model.name}": ${model.description || "(no description yet)"}. Revenue model: ${
        model.revenue_model || "not defined yet"
      }. Status: ${MODEL_STATUS_LABEL[model.status]}.\n\n` +
        `Related ideas I'm tracking: ${related.join(", ") || "none yet"}. Apps in progress: ${relatedApps.join(", ") || "none yet"}.\n\n` +
        `How am I doing managing this? What do I need help with right now, and what's a concrete, tailored plan for the next couple of weeks?`
    );
  }

  // ---- Social ----
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({ platform: "x" as SocialPlatform, handle: "" });
  const [metricsSheetOpen, setMetricsSheetOpen] = useState(false);
  const [metricsAccountId, setMetricsAccountId] = useState<string | null>(null);
  const [metricsForm, setMetricsForm] = useState({ followers: "", organic_views: "", ad_views: "", ad_cost: "" });

  const latestByAccount = useMemo(() => {
    const map = new Map<string, SocialMetricsLog>();
    for (const m of metrics) {
      const existing = map.get(m.account_id);
      if (!existing || m.log_date >= existing.log_date) map.set(m.account_id, m);
    }
    return map;
  }, [metrics]);

  const totalFollowers = [...latestByAccount.values()].reduce((s, m) => s + (m.followers ?? 0), 0);
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const since30ISO = since30.toISOString().slice(0, 10);
  const totalAdSpend30d = metrics.filter((m) => m.log_date >= since30ISO).reduce((s, m) => s + (m.ad_cost ?? 0), 0);
  const totalOrganicViews30d = metrics.filter((m) => m.log_date >= since30ISO).reduce((s, m) => s + (m.organic_views ?? 0), 0);

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("social_accounts").insert({ user_id: user.id, platform: accountForm.platform, handle: accountForm.handle.trim() });
    if (error) {
      toast("Couldn't add account.", "error");
      return;
    }
    toast("Account added.", "success");
    setAccountForm({ platform: "x", handle: "" });
    setAccountSheetOpen(false);
    router.refresh();
  }
  async function deleteAccount(id: string) {
    const ok = await confirm({ title: "Remove this account?", description: "Its logged metrics history will be removed too.", confirmLabel: "Remove", danger: true });
    if (!ok) return;
    const supabase = createClient();
    await supabase.from("social_accounts").delete().eq("id", id);
    toast("Account removed.", "success");
    router.refresh();
  }
  function openLogMetrics(accountId: string) {
    setMetricsAccountId(accountId);
    const existing = metrics.find((m) => m.account_id === accountId && m.log_date === todayISO());
    setMetricsForm({
      followers: existing?.followers?.toString() ?? "",
      organic_views: existing?.organic_views?.toString() ?? "",
      ad_views: existing?.ad_views?.toString() ?? "",
      ad_cost: existing?.ad_cost?.toString() ?? "",
    });
    setMetricsSheetOpen(true);
  }
  async function saveMetrics(e: React.FormEvent) {
    e.preventDefault();
    if (!metricsAccountId) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("social_metrics_logs").upsert(
      {
        user_id: user.id,
        account_id: metricsAccountId,
        log_date: todayISO(),
        followers: metricsForm.followers ? Number(metricsForm.followers) : null,
        organic_views: metricsForm.organic_views ? Number(metricsForm.organic_views) : null,
        ad_views: metricsForm.ad_views ? Number(metricsForm.ad_views) : null,
        ad_cost: metricsForm.ad_cost ? Number(metricsForm.ad_cost) : null,
      },
      { onConflict: "user_id,account_id,log_date" }
    );
    if (error) {
      toast("Couldn't save metrics.", "error");
      return;
    }
    toast("Metrics logged.", "success");
    setMetricsSheetOpen(false);
    router.refresh();
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Business</h1>
          <p className="text-sm text-text-secondary">Ideas, shipped apps, social reach, and the models tying it together.</p>
        </div>
        <Button variant="pill" onClick={() => askAmari("Look across everything I'm tracking in my Business section — ideas, apps, social accounts, and business models. How am I doing managing all of this? What needs my attention most right now?")}>
          <Sparkles className="h-3.5 w-3.5" /> Ask Amari
        </Button>
      </div>

      <div className="overflow-x-auto">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: "overview", label: "Overview" },
            { value: "ideas", label: "Ideas" },
            { value: "apps", label: "Apps" },
            { value: "social", label: "Social" },
            { value: "models", label: "Models" },
          ]}
        />
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard icon={Lightbulb} label="Ideas" value={ideas.length} />
            <MetricCard icon={Rocket} label="Apps shipped" value={apps.filter((a) => a.status === "shipped").length} suffix={`/${apps.length}`} />
            <MetricCard icon={TrendingUp} label="Total followers" value={totalFollowers} format={(v) => v.toLocaleString()} />
            <MetricCard icon={Layers} label="Ad spend · 30d" value={Math.round(totalAdSpend30d * 100)} format={(v) => currency(v / 100)} />
          </div>
          <p className="text-xs text-text-secondary">Organic views · 30d: {totalOrganicViews30d.toLocaleString()}</p>

          {models.length === 0 && apps.length === 0 && ideas.length === 0 && (
            <EmptyState icon={Rocket} title="Nothing tracked yet" description="Add an idea, an app, or a business model to get started." />
          )}
        </div>
      )}

      {tab === "ideas" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={openNewIdea} className="flex items-center gap-1 text-xs font-semibold text-blue-light">
              <Plus className="h-3.5 w-3.5" /> Add idea
            </button>
          </div>
          {ideas.length === 0 ? (
            <EmptyState icon={Lightbulb} title="No ideas yet" description="Dump every business idea here, even half-formed ones." />
          ) : (
            ideas.map((idea) => (
              <div key={idea.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{idea.title}</p>
                    {idea.description && <p className="mt-1 text-xs text-text-secondary">{idea.description}</p>}
                    <span className="mt-2 inline-block rounded-full border border-border-strong px-2 py-0.5 text-[10px] uppercase tracking-wide text-blue-light">
                      {IDEA_STATUS_LABEL[idea.status]}
                    </span>
                  </div>
                  <div className="flex flex-shrink-0 gap-1">
                    <button onClick={() => openEditIdea(idea)} aria-label="Edit" className="text-text-secondary hover:text-text">
                      <Edit2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    <button onClick={() => deleteIdea(idea.id)} aria-label="Delete" className="text-text-secondary hover:text-error">
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "apps" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={openNewApp} className="flex items-center gap-1 text-xs font-semibold text-blue-light">
              <Plus className="h-3.5 w-3.5" /> Add app
            </button>
          </div>
          {apps.length === 0 ? (
            <EmptyState icon={Rocket} title="No apps tracked" description="Add anything you've built or are building." />
          ) : (
            apps.map((app) => (
              <div key={app.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
                <ProgressRing value={app.completion_pct} size={48} stroke={4}>
                  <span className="text-xs font-semibold text-text">{app.completion_pct}%</span>
                </ProgressRing>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{app.name}</p>
                  {app.description && <p className="mt-0.5 truncate text-xs text-text-secondary">{app.description}</p>}
                  <p className="mt-1 text-xs text-text-secondary">
                    {APP_STATUS_LABEL[app.status]} · {app.status === "shipped" ? "shipped" : `${100 - app.completion_pct}% away from finished`}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <button onClick={() => openEditApp(app)} aria-label="Edit" className="text-text-secondary hover:text-text">
                    <Edit2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <button onClick={() => deleteApp(app.id)} aria-label="Delete" className="text-text-secondary hover:text-error">
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "social" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-xs text-text-secondary">
            Follower counts, views, and ad cost are logged manually for now — X, Instagram, TikTok, and YouTube each require their own developer API
            credentials. Once you have API keys for a platform, real sync can replace manual entry for that one.
          </div>
          <div className="flex justify-end">
            <button onClick={() => setAccountSheetOpen(true)} className="flex items-center gap-1 text-xs font-semibold text-blue-light">
              <Plus className="h-3.5 w-3.5" /> Add account
            </button>
          </div>
          {accounts.length === 0 ? (
            <EmptyState icon={Globe} title="No accounts yet" description="Add X, Instagram, TikTok, YouTube, or any other platform." />
          ) : (
            accounts.map((acc) => {
              const Icon = PLATFORM_ICON[acc.platform];
              const latest = latestByAccount.get(acc.id);
              const history = metrics
                .filter((m) => m.account_id === acc.id && m.followers != null)
                .map((m) => ({ label: dateLabel(m.log_date), value: m.followers as number }));
              return (
                <div key={acc.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Icon className="h-4 w-4 flex-shrink-0 text-blue-light" strokeWidth={2} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text">
                          {PLATFORM_LABEL[acc.platform]} {acc.handle && `· ${acc.handle}`}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {latest?.followers != null ? `${latest.followers.toLocaleString()} followers` : "No metrics logged yet"}
                          {latest?.ad_cost != null && ` · ${currency(latest.ad_cost)} ad spend`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <button onClick={() => openLogMetrics(acc.id)} className="rounded-full border border-border-strong px-3 py-1.5 text-xs font-semibold text-blue-light hover:bg-card-secondary">
                        Log today
                      </button>
                      <button onClick={() => deleteAccount(acc.id)} aria-label="Remove account" className="text-text-secondary hover:text-error">
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  {history.length > 1 && (
                    <div className="mt-3">
                      <AreaChart data={history} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "models" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={openNewModel} className="flex items-center gap-1 text-xs font-semibold text-blue-light">
              <Plus className="h-3.5 w-3.5" /> Add model
            </button>
          </div>
          {models.length === 0 ? (
            <EmptyState icon={Layers} title="No business models yet" description="Add each way you're making (or planning to make) money." />
          ) : (
            models.map((model) => (
              <div key={model.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{model.name}</p>
                    {model.description && <p className="mt-1 text-xs text-text-secondary">{model.description}</p>}
                    {model.revenue_model && <p className="mt-1 text-xs text-blue-light">{model.revenue_model}</p>}
                    <span className="mt-2 inline-block rounded-full border border-border-strong px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-secondary">
                      {MODEL_STATUS_LABEL[model.status]}
                    </span>
                  </div>
                  <div className="flex flex-shrink-0 gap-1">
                    <button onClick={() => openEditModel(model)} aria-label="Edit" className="text-text-secondary hover:text-text">
                      <Edit2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    <button onClick={() => deleteModel(model.id)} aria-label="Delete" className="text-text-secondary hover:text-error">
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </div>
                <button onClick={() => askAmariAboutModel(model)} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-blue-light">
                  <Sparkles className="h-3.5 w-3.5" /> Ask Amari about this
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Idea sheet */}
      <Sheet open={ideaSheetOpen} onClose={() => setIdeaSheetOpen(false)} title={editingIdeaId ? "Edit idea" : "New idea"}>
        <form onSubmit={saveIdea} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Title</label>
            <input
              type="text"
              value={ideaForm.title}
              onChange={(e) => setIdeaForm((f) => ({ ...f, title: e.target.value }))}
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Description</label>
            <textarea
              value={ideaForm.description}
              onChange={(e) => setIdeaForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Status</label>
            <select
              value={ideaForm.status}
              onChange={(e) => setIdeaForm((f) => ({ ...f, status: e.target.value as BusinessIdeaStatus }))}
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            >
              {Object.entries(IDEA_STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" block>
            {editingIdeaId ? "Save" : "Add idea"}
          </Button>
        </form>
      </Sheet>

      {/* App sheet */}
      <Sheet open={appSheetOpen} onClose={() => setAppSheetOpen(false)} title={editingAppId ? "Edit app" : "New app"}>
        <form onSubmit={saveApp} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Name</label>
            <input
              type="text"
              value={appForm.name}
              onChange={(e) => setAppForm((f) => ({ ...f, name: e.target.value }))}
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Description</label>
            <textarea
              value={appForm.description}
              onChange={(e) => setAppForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Completion %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={appForm.completion_pct}
                onChange={(e) => setAppForm((f) => ({ ...f, completion_pct: e.target.value }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Status</label>
              <select
                value={appForm.status}
                onChange={(e) => setAppForm((f) => ({ ...f, status: e.target.value as BusinessAppStatus }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              >
                {Object.entries(APP_STATUS_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Notes — what&apos;s left to fix</label>
            <textarea
              value={appForm.notes}
              onChange={(e) => setAppForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <Button type="submit" block>
            {editingAppId ? "Save" : "Add app"}
          </Button>
        </form>
      </Sheet>

      {/* Model sheet */}
      <Sheet open={modelSheetOpen} onClose={() => setModelSheetOpen(false)} title={editingModelId ? "Edit business model" : "New business model"}>
        <form onSubmit={saveModel} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Name</label>
            <input
              type="text"
              value={modelForm.name}
              onChange={(e) => setModelForm((f) => ({ ...f, name: e.target.value }))}
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Description</label>
            <textarea
              value={modelForm.description}
              onChange={(e) => setModelForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Revenue model</label>
            <input
              type="text"
              value={modelForm.revenue_model}
              onChange={(e) => setModelForm((f) => ({ ...f, revenue_model: e.target.value }))}
              placeholder="e.g. Monthly subscription, one-time sales, ads"
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Status</label>
            <select
              value={modelForm.status}
              onChange={(e) => setModelForm((f) => ({ ...f, status: e.target.value as BusinessModelStatus }))}
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            >
              {Object.entries(MODEL_STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" block>
            {editingModelId ? "Save" : "Add model"}
          </Button>
        </form>
      </Sheet>

      {/* Account sheet */}
      <Sheet open={accountSheetOpen} onClose={() => setAccountSheetOpen(false)} title="Add social account">
        <form onSubmit={addAccount} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Platform</label>
            <select
              value={accountForm.platform}
              onChange={(e) => setAccountForm((f) => ({ ...f, platform: e.target.value as SocialPlatform }))}
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            >
              {Object.entries(PLATFORM_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Handle</label>
            <input
              type="text"
              value={accountForm.handle}
              onChange={(e) => setAccountForm((f) => ({ ...f, handle: e.target.value }))}
              placeholder="@yourhandle"
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <Button type="submit" block>
            Add account
          </Button>
        </form>
      </Sheet>

      {/* Metrics sheet */}
      <Sheet open={metricsSheetOpen} onClose={() => setMetricsSheetOpen(false)} title="Log today's metrics">
        <form onSubmit={saveMetrics} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Followers</label>
              <input
                type="number"
                value={metricsForm.followers}
                onChange={(e) => setMetricsForm((f) => ({ ...f, followers: e.target.value }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Organic views</label>
              <input
                type="number"
                value={metricsForm.organic_views}
                onChange={(e) => setMetricsForm((f) => ({ ...f, organic_views: e.target.value }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Ad views</label>
              <input
                type="number"
                value={metricsForm.ad_views}
                onChange={(e) => setMetricsForm((f) => ({ ...f, ad_views: e.target.value }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Ad cost ($)</label>
              <input
                type="number"
                step="0.01"
                value={metricsForm.ad_cost}
                onChange={(e) => setMetricsForm((f) => ({ ...f, ad_cost: e.target.value }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
          </div>
          <Button type="submit" block>
            Save
          </Button>
        </form>
      </Sheet>

      <ChatSheet open={chatOpen} onClose={() => setChatOpen(false)} initialMessage={chatMessage} />
    </div>
  );
}
