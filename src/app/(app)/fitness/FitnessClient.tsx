"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Sparkles, Target, Dumbbell, Check, Trash2, Image as ImageIcon, RefreshCw, Pencil, Sparkle, GripVertical, Eye, Lock, SlidersHorizontal } from "lucide-react";
import type { FitnessProfile, FitnessProgressPhoto, FitnessAnalysis, WorkoutRoutine, WorkoutExercise, WorkoutCompletion, SplitRotationDay } from "@/lib/supabase/types";
import { AreaChart } from "@/components/AreaChart";
import { EmptyState } from "@/components/EmptyState";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/Button";
import { SplitRotationSheet } from "@/components/SplitRotationSheet";
import { SplitPickerCard } from "@/components/SplitPickerCard";
import { ExercisePickerSheet } from "@/components/ExercisePickerSheet";
import { TuneSheet } from "@/components/TuneSheet";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmationDialog";
import { computeRotationTodayIndex } from "@/lib/rotation";
import { WORKOUT_SPLITS, type WorkoutSplit } from "@/lib/workoutCatalog";

interface FitnessClientProps {
  profile: FitnessProfile | null;
  photos: FitnessProgressPhoto[];
  latestAnalysis: FitnessAnalysis | null;
  routine: WorkoutRoutine | null;
  exercises: WorkoutExercise[];
  todayCompletions: WorkoutCompletion[];
  rotationDays: SplitRotationDay[];
  today: string;
}

function dateLabel(iso: string) {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

async function uploadPhoto(file: File, userId: string, subfolder: string): Promise<string | null> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/fitness/${subfolder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: false, contentType: file.type || "image/jpeg" });
  if (error) return null;
  const { data } = supabase.storage.from("uploads").getPublicUrl(path);
  return data.publicUrl;
}

export function FitnessClient({ profile, photos, latestAnalysis, routine, exercises, todayCompletions, rotationDays, today }: FitnessClientProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [rotationSheetOpen, setRotationSheetOpen] = useState(false);
  const todayRotationIndex = computeRotationTodayIndex(rotationDays.length, profile?.rotation_anchor_date ?? null, profile?.rotation_anchor_index ?? null, today);
  const todayRotationDay = todayRotationIndex != null ? rotationDays[todayRotationIndex] : null;

  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    goal_description: profile?.goal_description ?? "",
    height_cm: profile?.height_cm?.toString() ?? "",
    current_weight_kg: profile?.current_weight_kg?.toString() ?? "",
    target_weight_kg: profile?.target_weight_kg?.toString() ?? "",
    target_date: profile?.target_date ?? "",
  });
  const [dreamUploading, setDreamUploading] = useState(false);

  const [logSheetOpen, setLogSheetOpen] = useState(false);
  const [logWeight, setLogWeight] = useState("");
  const [logFile, setLogFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewSplitId, setPreviewSplitId] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tuneExerciseId, setTuneExerciseId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const splitDef = routine?.split_id ? WORKOUT_SPLITS.find((s) => s.id === routine.split_id) : undefined;
  const days = splitDef ? [...new Set(splitDef.pattern)] : exercises.length ? [...new Set(exercises.map((e) => e.day_label || "Full Body"))] : ["Full Body"];
  const currentDay = days.includes(activeDay) ? activeDay : days[0];
  const dayExercises = exercises.filter((e) => (e.day_label || "Full Body") === currentDay).sort((a, b) => a.sort_order - b.sort_order);

  const weightData = useMemo(
    () => photos.filter((p) => p.weight_kg != null).map((p) => ({ label: dateLabel(p.taken_on), value: p.weight_kg as number })),
    [photos]
  );

  const estimatedDaysLeft = latestAnalysis?.estimated_weeks ? latestAnalysis.estimated_weeks * 7 : null;
  const completedIds = new Set(todayCompletions.filter((c) => c.completed).map((c) => c.exercise_id));

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("fitness_profile").upsert(
      {
        user_id: user.id,
        goal_description: profileForm.goal_description.trim(),
        height_cm: profileForm.height_cm ? Number(profileForm.height_cm) : null,
        current_weight_kg: profileForm.current_weight_kg ? Number(profileForm.current_weight_kg) : null,
        target_weight_kg: profileForm.target_weight_kg ? Number(profileForm.target_weight_kg) : null,
        target_date: profileForm.target_date || null,
      },
      { onConflict: "user_id" }
    );
    if (error) {
      toast("Couldn't save your fitness profile.", "error");
      return;
    }
    toast("Fitness profile saved.", "success");
    setProfileSheetOpen(false);
    router.refresh();
  }

  async function uploadDreamPhoto(file: File) {
    setDreamUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const url = await uploadPhoto(file, user.id, "dream");
    setDreamUploading(false);
    if (!url) {
      toast("Couldn't upload that photo.", "error");
      return;
    }
    await supabase.from("fitness_profile").upsert({ user_id: user.id, dream_photo_url: url }, { onConflict: "user_id" });
    toast("Dream photo saved.", "success");
    router.refresh();
  }

  async function logProgressPhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!logFile) {
      toast("Choose a photo first.", "error");
      return;
    }
    setAnalyzing(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const url = await uploadPhoto(logFile, user.id, "progress");
    if (!url) {
      toast("Couldn't upload that photo.", "error");
      setAnalyzing(false);
      return;
    }

    const weightKg = logWeight ? Number(logWeight) : null;
    const { error: insertError } = await supabase.from("fitness_progress_photos").insert({
      user_id: user.id,
      photo_url: url,
      taken_on: today,
      weight_kg: weightKg,
    });
    if (insertError) {
      toast("Couldn't save that photo.", "error");
      setAnalyzing(false);
      return;
    }
    if (weightKg) {
      await supabase.from("fitness_profile").upsert({ user_id: user.id, current_weight_kg: weightKg }, { onConflict: "user_id" });
    }

    try {
      const res = await fetch("/api/fitness/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrl: url,
          dreamPhotoUrl: profile?.dream_photo_url ?? null,
          goalDescription: profile?.goal_description ?? "",
          weightKg,
          heightCm: profile?.height_cm ?? null,
        }),
      });
      const data = await res.json();
      if (data.error === "not_configured" || data.error === "analysis_failed") {
        toast(data.text, "error");
      } else {
        toast("Photo logged and analyzed.", "success");
      }
    } catch {
      toast("Photo saved, but analysis failed.", "error");
    }

    setAnalyzing(false);
    setLogSheetOpen(false);
    setLogFile(null);
    setLogWeight("");
    router.refresh();
  }

  async function activateSplit(split: WorkoutSplit) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (routine) {
      await supabase.from("workout_exercises").delete().eq("routine_id", routine.id);
      const { error } = await supabase.from("workout_routines").update({ name: split.name, split_id: split.id, active: true }).eq("id", routine.id);
      if (error) return toast("Couldn't switch splits.", "error");
    } else {
      const { error } = await supabase.from("workout_routines").insert({ user_id: user.id, name: split.name, split_id: split.id, active: true });
      if (error) return toast("Couldn't start that split.", "error");
    }
    toast(`Using ${split.name} — pick exercises for each day.`, "success");
    setPreviewSplitId(null);
    setActiveDay(split.pattern[0]);
    router.refresh();
  }

  async function startCustomRoutine() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("workout_routines").insert({ user_id: user.id, name: "Custom routine", split_id: null, active: true });
    if (error) return toast("Couldn't create routine.", "error");
    toast("Routine created — add exercises below.", "success");
    router.refresh();
  }

  async function addCatalogExercise(day: string, name: string) {
    if (!routine) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const dayCount = exercises.filter((e) => (e.day_label || "Full Body") === day).length;
    const { error } = await supabase.from("workout_exercises").insert({
      user_id: user.id,
      routine_id: routine.id,
      name,
      day_label: day,
      sort_order: dayCount,
    });
    if (error) {
      toast("Couldn't add exercise.", "error");
      return;
    }
    router.refresh();
  }

  async function reorderExercise(id: string, direction: "up" | "down") {
    const idx = dayExercises.findIndex((e) => e.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= dayExercises.length) return;
    const a = dayExercises[idx];
    const b = dayExercises[swapIdx];
    const supabase = createClient();
    await Promise.all([
      supabase.from("workout_exercises").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("workout_exercises").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    router.refresh();
  }

  async function reorderDay(orderedIds: string[]) {
    const supabase = createClient();
    await Promise.all(orderedIds.map((id, i) => supabase.from("workout_exercises").update({ sort_order: i }).eq("id", id)));
    router.refresh();
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const ids = dayExercises.map((e) => e.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) {
      setDragId(null);
      return;
    }
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setDragId(null);
    reorderDay(ids);
  }

  async function updateExercise(id: string, updates: { weight_lb: number | null; sets: number | null; reps: string; rest_seconds: number | null }) {
    const supabase = createClient();
    const { error } = await supabase.from("workout_exercises").update(updates).eq("id", id);
    if (error) {
      toast("Couldn't save that change.", "error");
      return;
    }
    router.refresh();
  }

  async function toggleExercise(exerciseId: string, done: boolean) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("workout_completions").upsert(
      { user_id: user.id, exercise_id: exerciseId, log_date: today, completed: !done },
      { onConflict: "user_id,exercise_id,log_date" }
    );
    router.refresh();
  }

  async function deleteExercise(id: string) {
    const ok = await confirm({ title: "Remove exercise?", confirmLabel: "Remove", danger: true });
    if (!ok) return;
    const supabase = createClient();
    await supabase.from("workout_exercises").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Fitness</h1>
          <p className="text-sm text-text-secondary">Progress photos, AI analysis, and your workout routine.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setProfileSheetOpen(true)} className="min-h-10 px-3.5">
            <Target className="h-4 w-4" strokeWidth={2} /> Goal
          </Button>
          <Button onClick={() => setLogSheetOpen(true)} className="min-h-10 px-3.5">
            <Camera className="h-4 w-4" strokeWidth={2} /> Log photo
          </Button>
        </div>
      </div>

      {!profile?.goal_description && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-text-secondary">
          Set your fitness goal so analysis and workouts stay tailored to it —{" "}
          <button onClick={() => setProfileSheetOpen(true)} className="font-semibold text-blue-light">
            set it up
          </button>
          .
        </div>
      )}

      {latestAnalysis ? (
        <section className="rounded-2xl border border-blue/25 bg-blue/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-light" strokeWidth={2} />
            <h2 className="text-sm font-semibold text-text">Latest analysis</h2>
          </div>
          <p className="text-sm leading-relaxed text-text">{latestAnalysis.analysis_text}</p>

          {latestAnalysis.focus_areas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {latestAnalysis.focus_areas.map((f, i) => (
                <span key={i} className="rounded-full border border-border-strong bg-card px-2.5 py-1 text-xs text-blue-light">
                  {f}
                </span>
              ))}
            </div>
          )}

          {estimatedDaysLeft != null && (
            <p className="mt-3 text-xs text-text-secondary">
              Estimated <span className="font-semibold text-text">~{estimatedDaysLeft} days</span> ({latestAnalysis.estimated_weeks} weeks) of consistent effort to see meaningful change.
            </p>
          )}

          {latestAnalysis.next_steps.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {latestAnalysis.next_steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-blue-light" />
                  {step}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <EmptyState icon={Sparkles} title="No analysis yet" description="Log a progress photo to get an AI breakdown of where you are and what to focus on." />
      )}

      {weightData.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-1 text-sm font-medium text-text">Weight trend</p>
          <p className="mb-3 text-xs text-text-secondary">From logged progress photos</p>
          <AreaChart data={weightData} unit="kg" />
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-text">Progress photos</h2>
        {photos.length === 0 ? (
          <EmptyState icon={ImageIcon} title="No photos logged" description="Your progress timeline will build up here." />
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {[...photos].reverse().map((p) => (
              <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.photo_url} alt={`Progress photo from ${p.taken_on}`} className="aspect-square w-full object-cover" />
                <div className="px-2 py-1.5">
                  <p className="text-[10px] text-text-secondary">{dateLabel(p.taken_on)}</p>
                  {p.weight_kg != null && <p className="text-xs font-medium text-text">{p.weight_kg}kg</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="h-4 w-4 flex-shrink-0 text-blue-light" strokeWidth={2} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Split rotation</p>
              <p className="text-sm font-semibold text-text">{todayRotationDay ? `Today: ${todayRotationDay.name}` : "Not set up yet"}</p>
            </div>
          </div>
          <button
            onClick={() => setRotationSheetOpen(true)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 text-xs font-semibold text-blue-light hover:bg-card-secondary"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> {rotationDays.length ? "Edit" : "Set up"}
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
          <Dumbbell className="h-4 w-4 text-blue-light" strokeWidth={2} /> Workout routine
        </h2>

        {!routine ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {WORKOUT_SPLITS.map((split) => (
                <SplitPickerCard key={split.id} split={split} active={previewSplitId === split.id} onClick={() => setPreviewSplitId(previewSplitId === split.id ? null : split.id)} />
              ))}
            </div>

            {previewSplitId &&
              (() => {
                const split = WORKOUT_SPLITS.find((s) => s.id === previewSplitId)!;
                return (
                  <div className="glow-border rounded-3xl border border-blue/30 bg-card p-5">
                    {split.recommended && (
                      <span className="label-mono mb-2 inline-block rounded-full border border-warning/40 px-2 py-0.5 text-warning">Matched for you</span>
                    )}
                    <p className="text-2xl italic text-text" style={{ fontFamily: "var(--font-serif)" }}>
                      {split.name}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {split.daysPerWeek} {split.cycles ? "per cycle" : "per week"}
                    </p>
                    <p className="label-mono mt-4 text-blue-light">The call</p>
                    <p className="text-lg italic text-text" style={{ fontFamily: "var(--font-serif)" }}>
                      {split.call}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">{split.callBody}</p>
                    <p className="label-mono mt-4 text-blue-light">For you</p>
                    <p className="mt-1 border-l-2 border-blue/40 pl-3 text-sm italic text-text">{split.forYou}</p>
                    <Button onClick={() => activateSplit(split)} block className="mt-5">
                      Use this split →
                    </Button>
                  </div>
                );
              })()}

            <button onClick={startCustomRoutine} className="text-xs font-medium text-text-secondary hover:text-text">
              or start from scratch with a custom routine
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {days.map((day) => (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                      day === currentDay ? "border-blue bg-blue/15 text-blue-light" : "border-border text-text-secondary hover:text-text"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <button onClick={() => setPreviewSplitId(previewSplitId ? null : "__switch")} className="flex-shrink-0 text-xs font-semibold text-blue-light">
                Switch split
              </button>
            </div>

            {previewSplitId === "__switch" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {WORKOUT_SPLITS.map((split) => (
                  <SplitPickerCard key={split.id} split={split} active={false} onClick={() => activateSplit(split)} />
                ))}
              </div>
            )}

            <p className="italic text-text" style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem" }}>
              {currentDay}
            </p>

            {dayExercises.length === 0 ? (
              <EmptyState icon={Dumbbell} title={`No exercises for ${currentDay} yet`} description="Add one to start checking off sets." />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {dayExercises.map((ex, i) => {
                  const done = completedIds.has(ex.id);
                  const tuned = ex.weight_lb != null || ex.rest_seconds != null;
                  const meta = [ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.weight_lb != null && `${ex.weight_lb} lb`].filter(Boolean).join(" · ");
                  return (
                    <div
                      key={ex.id}
                      draggable
                      onDragStart={() => setDragId(ex.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(ex.id)}
                      className={`flex items-center gap-2 border-border px-3 py-3 transition-opacity ${i > 0 ? "border-t" : ""} ${dragId === ex.id ? "opacity-40" : ""}`}
                    >
                      <span className="flex-shrink-0 cursor-grab text-text-secondary/50 active:cursor-grabbing" aria-hidden="true">
                        <GripVertical className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <button onClick={() => toggleExercise(ex.id, done)} aria-label={done ? `Mark ${ex.name} not done` : `Mark ${ex.name} done`} className="flex-shrink-0">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                            done ? "border-success bg-success text-bg" : "border-border-strong text-transparent"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                      </button>
                      {tuned ? <Eye className="h-3.5 w-3.5 flex-shrink-0 text-blue-light" strokeWidth={2} /> : <Lock className="h-3.5 w-3.5 flex-shrink-0 text-text-secondary/50" strokeWidth={2} />}
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${done ? "text-text-secondary line-through" : "text-text"}`}>{ex.name}</p>
                        {meta && <p className="truncate text-xs text-text-secondary">{meta}</p>}
                      </div>
                      <button
                        onClick={() => setTuneExerciseId(ex.id)}
                        className="label-mono flex flex-shrink-0 items-center gap-1 rounded-full border border-border-strong px-2.5 py-1.5 text-blue-light transition-colors hover:bg-card-secondary"
                      >
                        <SlidersHorizontal className="h-3 w-3" strokeWidth={2} /> Tune
                      </button>
                      <button onClick={() => deleteExercise(ex.id)} aria-label={`Remove ${ex.name}`} className="flex-shrink-0 text-text-secondary transition-colors hover:text-error">
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setPickerOpen(true)}
              className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-sm font-medium text-text-secondary hover:border-border-strong hover:text-text"
            >
              <Sparkle className="h-3.5 w-3.5" strokeWidth={2} /> Add exercise to {currentDay}
            </button>
          </div>
        )}
      </section>

      <Sheet open={profileSheetOpen} onClose={() => setProfileSheetOpen(false)} title="Fitness goal">
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Goal</label>
            <textarea
              value={profileForm.goal_description}
              onChange={(e) => setProfileForm((f) => ({ ...f, goal_description: e.target.value }))}
              placeholder="e.g. Lean out and build visible core/shoulder definition by summer"
              rows={3}
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Height (cm)</label>
              <input
                type="number"
                value={profileForm.height_cm}
                onChange={(e) => setProfileForm((f) => ({ ...f, height_cm: e.target.value }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Current weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={profileForm.current_weight_kg}
                onChange={(e) => setProfileForm((f) => ({ ...f, current_weight_kg: e.target.value }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Target weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={profileForm.target_weight_kg}
                onChange={(e) => setProfileForm((f) => ({ ...f, target_weight_kg: e.target.value }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Target date</label>
              <input
                type="date"
                value={profileForm.target_date}
                onChange={(e) => setProfileForm((f) => ({ ...f, target_date: e.target.value }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Dream / target physique photo (optional)</label>
            {profile?.dream_photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.dream_photo_url} alt="Dream physique" className="mb-2 h-28 w-28 rounded-xl border border-border object-cover" />
            )}
            <input
              type="file"
              accept="image/*"
              disabled={dreamUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadDreamPhoto(file);
              }}
              className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-card-secondary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-text"
            />
            <p className="mt-1 text-xs text-text-secondary">Real or fictional — used only to compare against your progress photos.</p>
          </div>

          <Button type="submit" block>
            Save
          </Button>
        </form>
      </Sheet>

      <Sheet open={logSheetOpen} onClose={() => setLogSheetOpen(false)} title="Log progress photo">
        <form onSubmit={logProgressPhoto} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Photo</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setLogFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-card-secondary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-text"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Weight today (kg, optional)</label>
            <input
              type="number"
              step="0.1"
              value={logWeight}
              onChange={(e) => setLogWeight(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <p className="text-xs text-text-secondary">Amari will analyze this photo against your goal{profile?.dream_photo_url ? " and dream photo" : ""} and give you focus areas and next steps.</p>
          <Button type="submit" block disabled={analyzing}>
            {analyzing ? "Uploading & analyzing…" : "Log & analyze"}
          </Button>
        </form>
      </Sheet>

      <ExercisePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        day={currentDay}
        picks={dayExercises}
        onAdd={(name) => addCatalogExercise(currentDay, name)}
        onRemove={deleteExercise}
        onReorder={reorderExercise}
      />

      <TuneSheet
        open={!!tuneExerciseId}
        onClose={() => setTuneExerciseId(null)}
        exercise={exercises.find((e) => e.id === tuneExerciseId) ?? null}
        dayLabel={currentDay}
        onSave={updateExercise}
      />

      <SplitRotationSheet
        open={rotationSheetOpen}
        onClose={() => setRotationSheetOpen(false)}
        days={rotationDays}
        anchorDate={profile?.rotation_anchor_date ?? null}
        anchorIndex={profile?.rotation_anchor_index ?? null}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
