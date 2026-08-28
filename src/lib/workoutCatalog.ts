export type MuscleTag = "chest" | "shoulders" | "triceps" | "back" | "biceps" | "quads" | "hamstrings" | "glutes" | "calves" | "core";

export interface CatalogExercise {
  name: string;
  tag: MuscleTag;
}

export const EXERCISE_CATALOG: CatalogExercise[] = [
  { name: "Machine chest press", tag: "chest" },
  { name: "Barbell bench press", tag: "chest" },
  { name: "Incline DB press", tag: "chest" },
  { name: "Cable chest fly", tag: "chest" },
  { name: "Push-up", tag: "chest" },
  { name: "Weighted dip", tag: "chest" },
  { name: "Pec deck", tag: "chest" },
  { name: "Seated DB shoulder press", tag: "shoulders" },
  { name: "Cable lateral raise", tag: "shoulders" },
  { name: "DB lateral raise", tag: "shoulders" },
  { name: "Rear delt fly", tag: "shoulders" },
  { name: "Arnold press", tag: "shoulders" },
  { name: "Front raise", tag: "shoulders" },
  { name: "Tricep rope pushdown", tag: "triceps" },
  { name: "Overhead cable tri extension", tag: "triceps" },
  { name: "Close-grip bench press", tag: "triceps" },
  { name: "Skull crushers", tag: "triceps" },
  { name: "Tricep kickback", tag: "triceps" },
  { name: "Lat pulldown", tag: "back" },
  { name: "Seated cable row", tag: "back" },
  { name: "Barbell row", tag: "back" },
  { name: "Pull-up", tag: "back" },
  { name: "Chin-up", tag: "back" },
  { name: "Single-arm DB row", tag: "back" },
  { name: "Face pull", tag: "back" },
  { name: "Deadlift", tag: "back" },
  { name: "Barbell curl", tag: "biceps" },
  { name: "DB curl", tag: "biceps" },
  { name: "Hammer curl", tag: "biceps" },
  { name: "Cable curl", tag: "biceps" },
  { name: "Preacher curl", tag: "biceps" },
  { name: "Incline DB curl", tag: "biceps" },
  { name: "Back squat", tag: "quads" },
  { name: "Front squat", tag: "quads" },
  { name: "Leg press", tag: "quads" },
  { name: "Leg extension", tag: "quads" },
  { name: "Walking lunge", tag: "quads" },
  { name: "Bulgarian split squat", tag: "quads" },
  { name: "Romanian deadlift", tag: "hamstrings" },
  { name: "Lying leg curl", tag: "hamstrings" },
  { name: "Seated leg curl", tag: "hamstrings" },
  { name: "Good morning", tag: "hamstrings" },
  { name: "Hip thrust", tag: "glutes" },
  { name: "Glute bridge", tag: "glutes" },
  { name: "Cable kickback", tag: "glutes" },
  { name: "Sumo deadlift", tag: "glutes" },
  { name: "Standing calf raise", tag: "calves" },
  { name: "Seated calf raise", tag: "calves" },
  { name: "Plank", tag: "core" },
  { name: "Cable crunch", tag: "core" },
  { name: "Hanging leg raise", tag: "core" },
  { name: "Russian twist", tag: "core" },
  { name: "Ab wheel rollout", tag: "core" },
];

/** Which catalog tags are relevant for a given split-day label — used to filter the exercise picker's browse list. */
export const DAY_TAGS: Record<string, MuscleTag[]> = {
  "Full Body": ["chest", "back", "shoulders", "quads", "hamstrings", "glutes", "core"],
  Upper: ["chest", "back", "shoulders", "biceps", "triceps"],
  Lower: ["quads", "hamstrings", "glutes", "calves"],
  Push: ["chest", "shoulders", "triceps"],
  Pull: ["back", "biceps"],
  Legs: ["quads", "hamstrings", "glutes", "calves"],
  Chest: ["chest"],
  Back: ["back"],
  Shoulders: ["shoulders"],
  Arms: ["biceps", "triceps"],
};

export type SplitLevel = "beginner" | "intermediate" | "advanced";

export interface WorkoutSplit {
  id: string;
  name: string;
  level: SplitLevel;
  daysPerWeek: number;
  pattern: string[];
  cycles: boolean;
  recommended?: boolean;
  call: string;
  callBody: string;
  forYou: string;
}

export const WORKOUT_SPLITS: WorkoutSplit[] = [
  {
    id: "full_body_2",
    name: "Full Body",
    level: "beginner",
    daysPerWeek: 2,
    pattern: ["Full Body", "Full Body"],
    cycles: false,
    call: "Two days, everything.",
    callBody: "The lowest time commitment that still trains every muscle group twice a week — a solid entry point if you're new to structured training.",
    forYou: "Compound lifts first, accessories after. Consistency beats intensity here.",
  },
  {
    id: "full_body_3",
    name: "Full Body",
    level: "beginner",
    daysPerWeek: 3,
    pattern: ["Full Body", "Full Body", "Full Body"],
    cycles: false,
    call: "Three days, everything.",
    callBody: "The classic beginner default — full-body sessions three times a week build a base of strength across every major muscle group fast.",
    forYou: "Add a little weight each week. Progression is the whole game at this stage.",
  },
  {
    id: "upper_lower_4",
    name: "Upper / Lower",
    level: "intermediate",
    daysPerWeek: 4,
    pattern: ["Upper", "Lower", "Upper", "Lower"],
    cycles: false,
    recommended: true,
    call: "Four days, Upper/Lower.",
    callBody: "Every muscle hit twice a week — Schoenfeld 2016's sweet spot for hypertrophy, with enough volume per session to actually drive growth.",
    forYou: "Heavy compounds lead. You build strength first, then layer in the accessory volume.",
  },
  {
    id: "ppl_3",
    name: "Push Pull Legs",
    level: "intermediate",
    daysPerWeek: 3,
    pattern: ["Push", "Pull", "Legs"],
    cycles: true,
    call: "Three days, rotating.",
    callBody: "Push, Pull, Legs on a rolling cycle rather than a fixed week — flexible around a busy schedule while still hitting each muscle group with real frequency.",
    forYou: "Let the cycle repeat regardless of weekday. Missing a day just shifts the rotation, nothing is lost.",
  },
  {
    id: "bro_split_5",
    name: "Bro Split",
    level: "intermediate",
    daysPerWeek: 5,
    pattern: ["Chest", "Back", "Shoulders", "Arms", "Legs"],
    cycles: false,
    call: "Five days, one muscle group each.",
    callBody: "Maximum volume and focus per muscle group in a single session, at the cost of only training each once a week — works best with real training age.",
    forYou: "Go harder in fewer exercises. You get a full week to recover before hitting it again.",
  },
  {
    id: "ppl_6",
    name: "Push Pull Legs",
    level: "advanced",
    daysPerWeek: 6,
    pattern: ["Push", "Pull", "Legs", "Push", "Pull", "Legs"],
    cycles: true,
    call: "Six days, double rotation.",
    callBody: "The full Push/Pull/Legs cycle twice a week — high frequency and high volume. Only take this on if recovery (sleep, food, stress) is genuinely dialed in.",
    forYou: "This is a real commitment. Watch for creeping fatigue and deload before it forces you to.",
  },
];
