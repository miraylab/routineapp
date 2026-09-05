import { getSupabaseAccessToken } from "@/lib/supabaseAuth";

const SUPABASE_REST_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const AUDIO_BUCKET = "audio-notes";

interface AudioNoteRow {
  id: number;
  storage_path: string;
}

export function isSupabaseAudioConfigured() {
  return Boolean(SUPABASE_REST_URL && SUPABASE_ANON_KEY);
}

export async function createDailyAudioNote(input: {
  userId: string;
  entryDate: string;
  audioBlob: Blob;
  mimeType: string;
  durationSeconds?: number;
}) {
  return createAudioNote({
    userId: input.userId,
    context: "daily",
    entryDate: input.entryDate,
    audioBlob: input.audioBlob,
    mimeType: input.mimeType,
    durationSeconds: input.durationSeconds,
  });
}

export async function createStudyAudioNote(input: {
  userId: string;
  entryDate: string;
  projectId: string;
  audioBlob: Blob;
  mimeType: string;
  durationSeconds?: number;
}) {
  return createAudioNote({
    userId: input.userId,
    context: "study",
    entryDate: input.entryDate,
    projectId: input.projectId,
    audioBlob: input.audioBlob,
    mimeType: input.mimeType,
    durationSeconds: input.durationSeconds,
  });
}

export async function createReliefNoteAudio(input: {
  userId: string;
  entryDate: string;
  audioBlob: Blob;
  mimeType: string;
  durationSeconds?: number;
}) {
  return createAudioNote({
    userId: input.userId,
    context: "relief_note",
    entryDate: input.entryDate,
    audioBlob: input.audioBlob,
    mimeType: input.mimeType,
    durationSeconds: input.durationSeconds,
  });
}

async function createAudioNote(input: {
  userId: string;
  context: "daily" | "study" | "relief_note";
  entryDate: string;
  projectId?: string;
  audioBlob: Blob;
  mimeType: string;
  durationSeconds?: number;
}) {
  if (!isSupabaseAudioConfigured()) {
    throw new Error("Supabase audio is not configured");
  }

  const storagePath = [
    input.userId,
    input.entryDate,
    input.context,
    `${crypto.randomUUID()}.${extensionForMimeType(input.mimeType)}`,
  ].join("/");

  await uploadAudioObject(storagePath, input.audioBlob, input.mimeType);

  const [row] = await supabasePost<AudioNoteRow>("audio_notes", {
    user_id: input.userId,
    context: input.context,
    entry_date: input.entryDate,
    project_id: input.context === "study" ? Number(input.projectId) : null,
    storage_bucket: AUDIO_BUCKET,
    storage_path: storagePath,
    mime_type: input.mimeType,
    duration_seconds: input.durationSeconds ?? null,
    transcription_status: "pending",
  });

  return row;
}

async function uploadAudioObject(storagePath: string, audioBlob: Blob, mimeType: string) {
  const response = await fetch(
    `${normalizeProjectUrl(SUPABASE_REST_URL)}/storage/v1/object/${AUDIO_BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${getSupabaseAccessToken() ?? SUPABASE_ANON_KEY}`,
        "Content-Type": mimeType,
        "x-upsert": "false",
      },
      body: audioBlob,
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase audio upload: ${response.status} ${response.statusText}`);
  }
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

function extensionForMimeType(mimeType: string) {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}
