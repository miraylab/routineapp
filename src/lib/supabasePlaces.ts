import { getSupabaseAccessToken } from "@/lib/supabaseAuth";

const SUPABASE_REST_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface FixedPlace {
  id: string;
  label: string;
  kind: "home" | "work" | "gym" | "partner_home" | "shuttle_stop" | "other";
  address?: string;
  latitude: number;
  longitude: number;
  active: boolean;
}

interface FixedPlaceRow {
  id: number;
  label: string;
  kind: FixedPlace["kind"];
  address: string | null;
  latitude: number;
  longitude: number;
  active: boolean | null;
}

export function isSupabasePlacesConfigured() {
  return Boolean(SUPABASE_REST_URL && SUPABASE_ANON_KEY);
}

export async function fetchSupabaseFixedPlaces(accessToken?: string): Promise<FixedPlace[]> {
  if (!isSupabasePlacesConfigured()) return [];

  const rows = await supabaseGet<FixedPlaceRow>(
    "fixed_places",
    "select=id,label,kind,address,latitude,longitude,active&active=eq.true&order=sort_order.asc,id.asc",
    accessToken,
  );

  return rows.map((row) => ({
    id: String(row.id),
    label: row.label,
    kind: row.kind,
    address: row.address ?? undefined,
    latitude: row.latitude,
    longitude: row.longitude,
    active: row.active !== false,
  }));
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

function normalizeRestUrl(value: string | undefined) {
  const url = value?.trim().replace(/\/$/, "");
  if (!url) return "";
  return url.endsWith("/rest/v1") ? url : `${url}/rest/v1`;
}
