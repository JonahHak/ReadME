export interface Exercise {
  id: number;
  session_id: number;
  name: string;
  movement_pattern: string;
  sets: number;
  reps: string;
  load_kg: number | null;
  notes: string;
}

export interface Session {
  id: number;
  date: string;
  type: 'gym-strength' | 'gym-power' | 'conditioning' | 'sport';
  sport_name?: string;
  duration_min: number;
  rpe: number;
  notes: string;
  exercises: Exercise[];
}

export interface CheckIn {
  id: number;
  date: string;
  sleep_hours: number;
  sleep_quality: number;
  resting_hr?: number;
  hrv?: number;
  soreness: number;
  energy: number;
  stress: number;
}

export interface Profile {
  id: number;
  goals: string;
  sports: string;
  days_per_week: number;
  equipment: string;
}

export interface LoadDataPoint {
  date: string;
  dailyLoad: number;
  acuteLoad: number;
  chronicLoad: number;
  acwr: number;
}

export interface AnalyticsLoad {
  data: LoadDataPoint[];
  currentACWR: number;
  band: 'green' | 'yellow' | 'red' | 'undertrain';
}

export interface Readiness {
  score: number;
  reason: string;
  breakdown: Record<string, number>;
}

export interface RecommendedExercise {
  name: string;
  pattern: string;
  sets: number;
  reps: string;
  load_intent: string;
  notes: string;
}

export interface Recommendation {
  action: 'push' | 'hold' | 'deload';
  sessionType: string;
  focus: string;
  exercises: RecommendedExercise[];
  warmup: string[];
  rationale: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
