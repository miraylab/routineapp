import type { DailyHabit } from "@/data/mockData";
import { getSupabaseAccessToken } from "@/lib/supabaseAuth";

const SUPABASE_REST_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface HabitRow {
  id: number;
  title: string;
  days_of_week: number[] | null;
  created_at: string;
  archived_at: string | null;
}

interface HabitLogRow {
  habit_id: number;
  done_date: string;
}

export interface SupabaseHabitData {
  habits: DailyHabit[];
  doneDailyHabits: Record<string, string[]>;
}

export function isSupabaseHabitsConfigured() {
  return Boolean(SUPABASE_REST_URL && SUPABASE_ANON_KEY);
}

export async function fetchSupabaseHabitData(
  accessToken?: string,
): Promise<SupabaseHabitData | null> {
  if (!isSupabaseHabitsConfigured()) return null;

  const [habits, logs] = await Promise.all([
    supabaseGet<HabitRow>(
      "habits",
      "select=id,title,days_of_week,created_at,archived_at&archived_at=is.null&order=created_at.asc,id.asc",
      accessToken,
    ),
    supabaseGet<HabitLogRow>(
      "habit_logs",
      "select=habit_id,done_date&order=done_date.asc",
      accessToken,
    ),
  ]);

  return {
    habits: habits.map(mapHabit),
    doneDailyHabits: mapHabitLogs(logs),
  };
}

export async function createSupabaseHabit(input: {
  userId: string;
  title: string;
  daysOfWeek: number[];
}): Promise<DailyHabit> {
  const [row] = await supabasePost<HabitRow>("habits", {
    user_id: input.userId,
    title: input.title,
    days_of_week: input.daysOfWeek,
  });

  return mapHabit(row);
}

export async function updateSupabaseHabit(
  habitId: string,
  values: { title?: string; daysOfWeek?: number[] },
) {
  if (!isNumericId(habitId)) return false;
  await supabasePatch("habits", `id=eq.${habitId}`, {
    ...(values.title !== undefined ? { title: values.title } : {}),
    ...(values.daysOfWeek !== undefined ? { days_of_week: values.daysOfWeek } : {}),
  });
  return true;
}

export async function archiveSupabaseHabit(habitId: string) {
  if (!isNumericId(habitId)) return false;
  await supabasePatch("habits", `id=eq.${habitId}`, {
    archived_at: currentDateKey(),
  });
  return true;
}

export async function setSupabaseHabitDone(input: {
  userId: string;
  habitId: string;
  doneDate: string;
  done: boolean;
}) {
  if (!isNumericId(input.habitId)) return false;

  if (!input.done) {
    await supabaseDelete(
      "habit_logs",
      `habit_id=eq.${input.habitId}&done_date=eq.${input.doneDate}`,
    );
    return true;
  }

  await supabasePost<HabitLogRow>(
    "habit_logs",
    {
      user_id: input.userId,
      habit_id: Number(input.habitId),
      done_date: input.doneDate,
    },
    `on_conflict=habit_id,done_date`,
    "resolution=merge-duplicates,return=minimal",
  );
  return true;
}

function mapHabit(row: HabitRow): DailyHabit {
  return {
    id: String(row.id),
    title: row.title,
    daysOfWeek: row.days_of_week ?? undefined,
    createdAt: row.created_at,
  };
}

function mapHabitLogs(rows: HabitLogRow[]) {
  return rows.reduce<Record<string, string[]>>((acc, row) => {
    const id = String(row.habit_id);
    acc[row.done_date] = acc[row.done_date]?.includes(id)
      ? acc[row.done_date]
      : [...(acc[row.done_date] ?? []), id];
    return acc;
  }, {});
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

async function supabasePost<T>(
  table: string,
  body: Record<string, unknown>,
  query = "",
  prefer = "return=representation",
): Promise<T[]> {
  const suffix = query ? `?${query}` : "";
  const response = await fetch(`${normalizeRestUrl(SUPABASE_REST_URL)}/${table}${suffix}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${getSupabaseAccessToken() ?? SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: prefer,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table}: ${response.status} ${response.statusText}`);
  }

  if (prefer.includes("return=minimal")) return [] as T[];
  return (await response.json()) as T[];
}

async function supabasePatch(
  table: string,
  filter: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`${normalizeRestUrl(SUPABASE_REST_URL)}/${table}?${filter}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${getSupabaseAccessToken() ?? SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table}: ${response.status} ${response.statusText}`);
  }
}

async function supabaseDelete(table: string, filter: string) {
  const response = await fetch(`${normalizeRestUrl(SUPABASE_REST_URL)}/${table}?${filter}`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${getSupabaseAccessToken() ?? SUPABASE_ANON_KEY}`,
      Prefer: "return=minimal",
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table}: ${response.status} ${response.statusText}`);
  }
}

function normalizeRestUrl(value: string | undefined) {
  const url = value?.trim().replace(/\/$/, "");
  if (!url) return "";
  return url.endsWith("/rest/v1") ? url : `${url}/rest/v1`;
}

function isNumericId(value: string | undefined) {
  return Boolean(value && /^\d+$/.test(value));
}

function currentDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
