import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import { FitnessClient } from "./FitnessClient";
import type { FitnessProfile, FitnessProgressPhoto, FitnessAnalysis, WorkoutRoutine, WorkoutExercise, WorkoutCompletion, SplitRotationDay } from "@/lib/supabase/types";

export default async function FitnessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, photosRes, analysesRes, routineRes, rotationRes] = await Promise.all([
    supabase.from("fitness_profile").select("*").eq("user_id", user!.id).maybeSingle(),
    supabase.from("fitness_progress_photos").select("*").eq("user_id", user!.id).order("taken_on", { ascending: true }),
    supabase.from("fitness_analyses").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1),
    supabase.from("workout_routines").select("*").eq("user_id", user!.id).eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("split_rotation_days").select("*").eq("user_id", user!.id).order("sort_order", { ascending: true }),
  ]);

  const routine = (routineRes.data ?? null) as WorkoutRoutine | null;

  const [exercisesRes, completionsRes] = await Promise.all([
    routine
      ? supabase.from("workout_exercises").select("*").eq("routine_id", routine.id).order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase.from("workout_completions").select("*").eq("user_id", user!.id).eq("log_date", todayISO()),
  ]);

  return (
    <FitnessClient
      profile={(profileRes.data ?? null) as FitnessProfile | null}
      photos={(photosRes.data ?? []) as FitnessProgressPhoto[]}
      latestAnalysis={((analysesRes.data ?? [])[0] ?? null) as FitnessAnalysis | null}
      routine={routine}
      exercises={(exercisesRes.data ?? []) as WorkoutExercise[]}
      todayCompletions={(completionsRes.data ?? []) as WorkoutCompletion[]}
      rotationDays={(rotationRes.data ?? []) as SplitRotationDay[]}
      today={todayISO()}
    />
  );
}
