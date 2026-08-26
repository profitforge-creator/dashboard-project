"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Sparkles, Target, Dumbbell, Plus, Check, Trash2, Image as ImageIcon } from "lucide-react";
import type { FitnessProfile, FitnessProgressPhoto, FitnessAnalysis, WorkoutRoutine, WorkoutExercise, WorkoutCompletion } from "@/lib/supabase/types";
import { AreaChart } from "@/components/AreaChart";
import { EmptyState } from "@/components/EmptyState";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/Button";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmationDialog";

interface FitnessClientProps {
  profile: FitnessProfile | null;
  photos: FitnessProgressPhoto[];
  latestAnalysis: FitnessAnalysis | null;
  routine: WorkoutRoutine | null;
  exercises: WorkoutExercise[];
  todayCompletions: WorkoutCompletion[];
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

export function FitnessClient({ profile, photos, latestAnalysis, routine, exercises, todayCompletions, today }: FitnessClientProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

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

  const [routineSheetOpen, setRoutineSheetOpen] = useState(false);
  const [routineName, setRoutineName] = useState("");
  const [exerciseSheetOpen, setExerciseSheetOpen] = useState(false);
  const [exerciseForm, setExerciseForm] = useState({ name: "", sets: "", reps: "", notes: "" });

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

  async function createRoutine(e: React.FormEvent) {
    e.preventDefault();
    if (!routineName.trim()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("workout_routines").insert({ user_id: user.id, name: routineName.trim(), active: true });
    if (error) {
      toast("Couldn't create routine.", "error");
      return;
    }
    setRoutineName("");
    setRoutineSheetOpen(false);
    router.refresh();
  }

  async function addExercise(e: React.FormEvent) {
    e.preventDefault();
    if (!exerciseForm.name.trim() || !routine) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("workout_exercises").insert({
      user_id: user.id,
      routine_id: routine.id,
      name: exerciseForm.name.trim(),
      sets: exerciseForm.sets ? Number(exerciseForm.sets) : null,
      reps: exerciseForm.reps.trim(),
      notes: exerciseForm.notes.trim(),
      sort_order: exercises.length,
    });
    if (error) {
      toast("Couldn't add exercise.", "error");
      return;
    }
    setExerciseForm({ name: "", sets: "", reps: "", notes: "" });
    setExerciseSheetOpen(false);
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

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <Dumbbell className="h-4 w-4 text-blue-light" strokeWidth={2} /> Workout routine
          </h2>
          {routine && (
            <button onClick={() => setExerciseSheetOpen(true)} className="flex items-center gap-1 text-xs font-semibold text-blue-light">
              <Plus className="h-3.5 w-3.5" /> Add exercise
            </button>
          )}
        </div>

        {!routine ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center">
            <p className="mb-3 text-sm text-text-secondary">No active routine yet.</p>
            <Button onClick={() => setRoutineSheetOpen(true)} variant="pill" className="mx-auto min-h-10 px-4">
              Create routine
            </Button>
          </div>
        ) : exercises.length === 0 ? (
          <EmptyState icon={Dumbbell} title={`"${routine.name}" has no exercises yet`} description="Add one to start checking off sets." />
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{routine.name}</p>
            {exercises.map((ex) => {
              const done = completedIds.has(ex.id);
              return (
                <div key={ex.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5">
                  <button onClick={() => toggleExercise(ex.id, done)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        done ? "border-success bg-success text-bg" : "border-border-strong text-transparent"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span className="min-w-0">
                      <p className={`truncate text-sm font-medium ${done ? "text-text-secondary line-through" : "text-text"}`}>{ex.name}</p>
                      <p className="truncate text-xs text-text-secondary">
                        {ex.sets ? `${ex.sets} sets` : ""}
                        {ex.sets && ex.reps && " · "}
                        {ex.reps}
                        {ex.notes && ` · ${ex.notes}`}
                      </p>
                    </span>
                  </button>
                  <button onClick={() => deleteExercise(ex.id)} aria-label={`Remove ${ex.name}`} className="flex-shrink-0 text-text-secondary transition-colors hover:text-error">
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              );
            })}
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

      <Sheet open={routineSheetOpen} onClose={() => setRoutineSheetOpen(false)} title="New routine">
        <form onSubmit={createRoutine} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Routine name</label>
            <input
              type="text"
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              placeholder="e.g. Push/Pull/Legs"
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              required
            />
          </div>
          <Button type="submit" block>
            Create
          </Button>
        </form>
      </Sheet>

      <Sheet open={exerciseSheetOpen} onClose={() => setExerciseSheetOpen(false)} title="Add exercise">
        <form onSubmit={addExercise} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Name</label>
            <input
              type="text"
              value={exerciseForm.name}
              onChange={(e) => setExerciseForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Incline dumbbell press"
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Sets</label>
              <input
                type="number"
                value={exerciseForm.sets}
                onChange={(e) => setExerciseForm((f) => ({ ...f, sets: e.target.value }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Reps</label>
              <input
                type="text"
                value={exerciseForm.reps}
                onChange={(e) => setExerciseForm((f) => ({ ...f, reps: e.target.value }))}
                placeholder="e.g. 8-10"
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Notes</label>
            <input
              type="text"
              value={exerciseForm.notes}
              onChange={(e) => setExerciseForm((f) => ({ ...f, notes: e.target.value }))}
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <Button type="submit" block>
            Add exercise
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
