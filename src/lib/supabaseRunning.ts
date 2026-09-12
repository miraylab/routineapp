import { getSupabaseAccessToken } from "@/lib/supabaseAuth";

const SUPABASE_REST_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface RunningWorkout {
  id: string;
  workoutDate: string;
  title: string;
  durationSeconds: number;
  distanceKm: number;
  paceSecondsPerKm: number;
  createdAt: string;
}

interface RunningWorkoutRow {
  id: number;
  workout_date: string;
  title: string | null;
  duration_seconds: number;
  distance_km: number;
  pace_seconds_per_km: number;
  created_at: string;
}

export function isSupabaseRunningConfigured() {
  return Boolean(SUPABASE_REST_URL && SUPABASE_ANON_KEY);
}

export async function fetchRunningWorkouts(accessToken?: string): Promise<RunningWorkout[]> {
  if (!isSupabaseRunningConfigured()) return [];

  const rows = await supabaseGet<RunningWorkoutRow>(
    "running_workouts",
    "select=id,workout_date,title,duration_seconds,distance_km,pace_seconds_per_km,created_at&order=workout_date.asc,created_at.asc",
    accessToken,
  );

  return rows.map(mapRunningWorkout);
}

export async function createRunningWorkout(input: {
  userId: string;
  workoutDate: string;
  title: string;
  durationSeconds: number;
  distanceKm: number;
}): Promise<RunningWorkout> {
  const paceSecondsPerKm = Math.round(input.durationSeconds / input.distanceKm);
  const [row] = await supabasePost<RunningWorkoutRow>("running_workouts", {
    user_id: input.userId,
    workout_date: input.workoutDate,
    title: input.title,
    duration_seconds: input.durationSeconds,
    distance_km: input.distanceKm,
    pace_seconds_per_km: paceSecondsPerKm,
  });

  return mapRunningWorkout(row);
}

async function supabaseGet<T>(
  table: string,
  query: string,
  accessToken?: string,
): Promise<T[]> {
  const response = await fetch(`${normalizeRestUrl(SUPABASE_REST_URL)}/${table}?${query}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken ?? getSupabaseAccessToken() ?? SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T[];
}

async function supabasePost<T>(table: string, body: Record<string, unknown>): Promise<T[]> {
  const response = await fetch(`${normalizeRestUrl(SUPABASE_REST_URL)}/${table}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${getSupabaseAccessToken() ?? SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T[];
}

function mapRunningWorkout(row: RunningWorkoutRow): RunningWorkout {
  return {
    id: String(row.id),
    workoutDate: row.workout_date,
    title: row.title ?? "Corrida",
    durationSeconds: Number(row.duration_seconds),
    distanceKm: Number(row.distance_km),
    paceSecondsPerKm: Number(row.pace_seconds_per_km),
    createdAt: row.created_at,
  };
}

function normalizeRestUrl(value: string | undefined) {
  const url = value?.trim().replace(/\/$/, "");
  if (!url) return "";
  return url.endsWith("/rest/v1") ? url : `${url}/rest/v1`;
}
