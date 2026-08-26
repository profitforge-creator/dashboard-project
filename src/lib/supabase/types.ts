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

export type TaskRecurrence = "none" | "daily" | "weekdays" | "weekly";

export interface Task {
  id: string;
  user_id: string;
  goal_id: string | null;
  title: string;
  description: string;
  category: GoalCategory;
  priority: GoalPriority;
  task_date: string;
  task_time: string | null;
  estimated_minutes: number | null;
  recurrence: TaskRecurrence;
  notes: string;
  sort_order: number;
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

export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "savings_contribution"
  | "investment_contribution"
  | "refund"
  | "recurring_bill"
  | "debt_payment";

export type BudgetCategoryKey =
  | "baseline_survival"
  | "flexible_needs"
  | "optional_spending"
  | "savings"
  | "emergency_fund"
  | "business_building"
  | "investing"
  | "debt"
  | "giving"
  | "unallocated";

export type TransactionCategory = BudgetCategoryKey | "income";

export interface FinancialAccount {
  id: string;
  user_id: string;
  name: string;
  kind: "checking" | "savings" | "cash" | "credit" | "investment" | "other";
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category: TransactionCategory;
  occurred_at: string;
  merchant: string;
  account_id: string | null;
  need_or_want: "need" | "want" | null;
  fixed_or_variable: "fixed" | "variable" | null;
  is_recurring: boolean;
  is_baseline_survival: boolean;
  notes: string;
  receipt_url: string | null;
  goal_id: string | null;
  created_at: string;
}

export interface BudgetPeriod {
  id: string;
  user_id: string;
  starts_on: string;
  ends_on: string;
  planned_income: number;
  created_at: string;
}

export interface BudgetCategoryAllocation {
  id: string;
  user_id: string;
  budget_period_id: string;
  category: BudgetCategoryKey;
  planned_amount: number;
  created_at: string;
}

export type FinancialGoalKind =
  | "emergency_fund"
  | "business_capital"
  | "purchase"
  | "debt_payoff"
  | "investing"
  | "travel"
  | "long_term_savings";

export interface FinancialGoal {
  id: string;
  user_id: string;
  title: string;
  kind: FinancialGoalKind;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface HealthLog {
  id: string;
  user_id: string;
  log_date: string;
  steps: number | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  notes: string;
  source: "manual" | "shortcut";
  created_at: string;
}

export interface Supplement {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  schedule_note: string;
  active: boolean;
  created_at: string;
}

export interface SupplementLog {
  id: string;
  user_id: string;
  supplement_id: string;
  log_date: string;
  taken: boolean;
  created_at: string;
}

export interface HealthSyncToken {
  user_id: string;
  token: string;
  created_at: string;
}

export interface FitnessProfile {
  user_id: string;
  goal_description: string;
  height_cm: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  target_date: string | null;
  dream_photo_url: string | null;
  updated_at: string;
}

export interface FitnessProgressPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  taken_on: string;
  weight_kg: number | null;
  notes: string;
  created_at: string;
}

export interface FitnessAnalysis {
  id: string;
  user_id: string;
  source_photo_url: string;
  analysis_text: string;
  focus_areas: string[];
  estimated_weeks: number | null;
  next_steps: string[];
  created_at: string;
}

export interface WorkoutRoutine {
  id: string;
  user_id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  user_id: string;
  routine_id: string;
  name: string;
  sets: number | null;
  reps: string;
  notes: string;
  sort_order: number;
  created_at: string;
}

export interface WorkoutCompletion {
  id: string;
  user_id: string;
  exercise_id: string;
  log_date: string;
  completed: boolean;
  created_at: string;
}

export interface OnboardingResponse {
  id: string;
  user_id: string;
  question_key: string;
  answer: unknown;
  created_at: string;
}

