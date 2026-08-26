export type Appearance = "dark" | "light" | "system";
export type CoachingPersonality = "direct" | "encouraging" | "calm" | "tough_love";
export type GoalTerm = "long" | "short";
export type GoalCategory = "health" | "business" | "financial" | "spiritual" | "general";
export type GoalPriority = "low" | "medium" | "high";
export type GoalStatus = "active" | "completed";
export type FocusStatus = "running" | "paused" | "completed" | "cancelled";
export type IntegrationProvider = "google_calendar" | "ai_voice" | "crypto_wallet" | "financial";
export type IntegrationStatus = "disconnected" | "connected" | "error";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  appearance: Appearance;
  coaching_personality: CoachingPersonality;
  wake_phrase: string;
  notifications_enabled: boolean;
  onboarding_completed: boolean;
  streak_count: number;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  term: GoalTerm;
  category: GoalCategory;
  priority: GoalPriority;
  status: GoalStatus;
  next_action: string;
  deadline: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface GoalProgressLog {
  id: string;
  goal_id: string;
  user_id: string;
  progress_pct: number;
  note: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  goal_id: string | null;
  title: string;
  task_date: string;
  task_time: string | null;
  is_priority: boolean;
  completed: boolean;
  created_at: string;
}

export interface FocusSession {
  id: string;
  user_id: string;
  goal_id: string | null;
  preset: string;
  planned_minutes: number;
  actual_seconds: number;
  status: FocusStatus;
  started_at: string;
  ended_at: string | null;
  notes: string;
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  category: GoalCategory;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  log_date: string;
  completed: boolean;
}

export interface IntegrationConnection {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  metadata: Record<string, unknown>;
  connected_at: string | null;
  updated_at: string;
}

export interface OnboardingResponse {
  id: string;
  user_id: string;
  question_key: string;
  answer: unknown;
  created_at: string;
}

