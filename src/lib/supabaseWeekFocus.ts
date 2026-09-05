import type { WeekMilestone } from "@/data/mockData";
import { getSupabaseAccessToken } from "@/lib/supabaseAuth";

const SUPABASE_REST_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface WeekFocusRow {
  id: number;
  week_start: string;
  title: string;
  day_of_week: number;
  description: string | null;
  done_date: string | null;
}

export function isSupabaseWeekFocusConfigured() {
  return Boolean(SUPABASE_REST_URL && SUPABASE_ANON_KEY);
}

export async function fetchSupabaseWeekFocus(accessToken?: string): Promise<WeekMilestone[]> {
  if (!isSupabaseWeekFocusConfigured()) return [];

  const rows = await supabaseGet<WeekFocusRow>(
    "week_focus",
    "select=id,week_start,title,day_of_week,description,done_date&order=week_start.desc,day_of_week.asc,id.asc",
    accessToken,
  );

  return rows.map(mapWeekFocus);
}

export async function createSupabaseWeekFocus(input: {
  userId: string;
  weekStart: string;
  title: string;
  dayOfWeek: number;
  detail?: string;
}): Promise<WeekMilestone> {
  const [row] = await supabasePost<WeekFocusRow>("week_focus", {
    user_id: input.userId,
    week_start: input.weekStart,
    title: input.title,
    day_of_week: input.dayOfWeek,
    description: input.detail ?? null,
    done_date: null,
  });

  return mapWeekFocus(row);
}

export async function updateSupabaseWeekFocus(
  id: string,
  input: { title?: string; dayOfWeek?: number; detail?: string },
) {
  if (!isNumericId(id)) return false;
  await supabasePatch("week_focus", `id=eq.${id}`, {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.dayOfWeek !== undefined ? { day_of_week: input.dayOfWeek } : {}),
    ...(input.detail !== undefined ? { description: input.detail || null } : {}),
  });
  return true;
}

export async function updateSupabaseWeekFocusDone(id: string, doneDate: string | null) {
  if (!isNumericId(id)) return false;
  await supabasePatch("week_focus", `id=eq.${id}`, { done_date: doneDate });
  return true;
}

export async function deleteSupabaseWeekFocus(id: string) {
  if (!isNumericId(id)) return false;
  await supabaseDelete("week_focus", `id=eq.${id}`);
  return true;
}

function mapWeekFocus(row: WeekFocusRow): WeekMilestone {
  return {
    id: String(row.id),
    title: row.title,
    dayOfWeek: row.day_of_week,
    dayLabel: WEEKDAY_LABELS[row.day_of_week] ?? "DOM",
    weekStart: row.week_start,
    detail: row.description ?? undefined,
    doneDate: row.done_date ?? undefined,
  };
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

const WEEKDAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
