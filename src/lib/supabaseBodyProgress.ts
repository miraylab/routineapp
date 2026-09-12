import { getSupabaseAccessToken } from "@/lib/supabaseAuth";

const SUPABASE_REST_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const BODY_PROGRESS_BUCKET = "body-progress-images";

export interface BodyWeightEntry {
  id: string;
  measuredAt: string;
  weightKg: number;
}

export interface BodyImageEntry {
  id: string;
  capturedAt: string;
  storagePath: string;
  imageUrl?: string;
}

export interface BodyWeightGoal {
  id: string;
  targetWeightKg: number;
}

interface BodyWeightRow {
  id: number;
  measured_at: string;
  weight_kg: number;
}

interface BodyImageRow {
  id: number;
  captured_at: string;
  storage_path: string;
}

interface BodyWeightGoalRow {
  id: number;
  target_weight_kg: number;
}

interface SignedUrlResponse {
  signedURL?: string;
  signedUrl?: string;
}

export function isSupabaseBodyProgressConfigured() {
  return Boolean(SUPABASE_REST_URL && SUPABASE_ANON_KEY);
}

export async function fetchBodyWeightEntries(accessToken?: string): Promise<BodyWeightEntry[]> {
  if (!isSupabaseBodyProgressConfigured()) return [];

  const rows = await supabaseGet<BodyWeightRow>(
    "body_weight_entries",
    "select=id,measured_at,weight_kg&order=measured_at.asc",
    accessToken,
  );

  return rows.map(mapWeightEntry);
}

export async function fetchBodyWeightGoal(accessToken?: string): Promise<BodyWeightGoal | null> {
  if (!isSupabaseBodyProgressConfigured()) return null;

  const rows = await supabaseGet<BodyWeightGoalRow>(
    "body_weight_goals",
    "select=id,target_weight_kg&limit=1",
    accessToken,
  );

  return rows[0] ? mapWeightGoal(rows[0]) : null;
}

export async function createBodyWeightEntry(input: {
  userId: string;
  weightKg: number;
}): Promise<BodyWeightEntry> {
  const [row] = await supabasePost<BodyWeightRow>("body_weight_entries", {
    user_id: input.userId,
    weight_kg: input.weightKg,
  });

  return mapWeightEntry(row);
}

export async function upsertBodyWeightGoal(input: {
  userId: string;
  targetWeightKg: number;
  currentGoalId?: string;
}): Promise<BodyWeightGoal> {
  if (input.currentGoalId) {
    const [row] = await supabasePatch<BodyWeightGoalRow>(
      "body_weight_goals",
      `id=eq.${input.currentGoalId}`,
      { target_weight_kg: input.targetWeightKg },
    );
    return mapWeightGoal(row);
  }

  const [row] = await supabasePost<BodyWeightGoalRow>("body_weight_goals", {
    user_id: input.userId,
    target_weight_kg: input.targetWeightKg,
  });

  return mapWeightGoal(row);
}

export async function fetchBodyImageEntries(
  accessToken?: string,
  options: { signedUrls?: boolean } = { signedUrls: true },
): Promise<BodyImageEntry[]> {
  if (!isSupabaseBodyProgressConfigured()) return [];

  const rows = await supabaseGet<BodyImageRow>(
    "body_image_entries",
    "select=id,captured_at,storage_path&order=captured_at.desc",
    accessToken,
  );

  const entries = rows.map(mapImageEntry);
  if (!options.signedUrls) return entries;

  return Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      imageUrl: await createSignedImageUrl(entry.storagePath, accessToken),
    })),
  );
}

export async function createBodyImageEntry(input: {
  userId: string;
  imageFile: File;
}): Promise<BodyImageEntry> {
  const storagePath = [
    input.userId,
    currentDateKey(),
    `${crypto.randomUUID()}.${extensionForMimeType(input.imageFile.type)}`,
  ].join("/");

  await uploadImageObject(storagePath, input.imageFile);

  const [row] = await supabasePost<BodyImageRow>("body_image_entries", {
    user_id: input.userId,
    storage_bucket: BODY_PROGRESS_BUCKET,
    storage_path: storagePath,
    mime_type: input.imageFile.type || "image/jpeg",
  });

  return {
    ...mapImageEntry(row),
    imageUrl: await createSignedImageUrl(storagePath),
  };
}

async function uploadImageObject(storagePath: string, imageFile: File) {
  const response = await fetch(
    `${normalizeProjectUrl(SUPABASE_REST_URL)}/storage/v1/object/${BODY_PROGRESS_BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${getSupabaseAccessToken() ?? SUPABASE_ANON_KEY}`,
        "Content-Type": imageFile.type || "image/jpeg",
        "x-upsert": "false",
      },
      body: imageFile,
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase body image upload: ${response.status} ${response.statusText}`);
  }
}

async function createSignedImageUrl(storagePath: string, accessToken?: string) {
  const response = await fetch(
    `${normalizeProjectUrl(SUPABASE_REST_URL)}/storage/v1/object/sign/${BODY_PROGRESS_BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken ?? getSupabaseAccessToken() ?? SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 60 * 60 }),
    },
  );

  if (!response.ok) return undefined;

  const payload = (await response.json()) as SignedUrlResponse;
  const signedPath = payload.signedURL ?? payload.signedUrl;
  if (!signedPath) return undefined;
  return signedPath.startsWith("http")
    ? signedPath
    : `${normalizeProjectUrl(SUPABASE_REST_URL)}${signedPath}`;
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

async function supabasePatch<T>(
  table: string,
  filter: string,
  body: Record<string, unknown>,
): Promise<T[]> {
  const response = await fetch(`${normalizeRestUrl(SUPABASE_REST_URL)}/${table}?${filter}`, {
    method: "PATCH",
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

function mapWeightEntry(row: BodyWeightRow): BodyWeightEntry {
  return {
    id: String(row.id),
    measuredAt: row.measured_at,
    weightKg: Number(row.weight_kg),
  };
}

function mapWeightGoal(row: BodyWeightGoalRow): BodyWeightGoal {
  return {
    id: String(row.id),
    targetWeightKg: Number(row.target_weight_kg),
  };
}

function mapImageEntry(row: BodyImageRow): BodyImageEntry {
  return {
    id: String(row.id),
    capturedAt: row.captured_at,
    storagePath: row.storage_path,
  };
}

function normalizeProjectUrl(value: string | undefined) {
  const url = value?.trim().replace(/\/$/, "");
  if (!url) return "";
  return url.endsWith("/rest/v1") ? url.slice(0, -"/rest/v1".length) : url;
}

function normalizeRestUrl(value: string | undefined) {
  const url = value?.trim().replace(/\/$/, "");
  if (!url) return "";
  return url.endsWith("/rest/v1") ? url : `${url}/rest/v1`;
}

function currentDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function extensionForMimeType(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}
