const INTERVALS_BASE_URL = "https://intervals.icu/api/v1";
const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

type WellnessRecord = Record<string, unknown>;
type RuntimeEnv = Record<string, unknown>;

let runtimeEnv: RuntimeEnv | null = null;

export interface NormalizedSleep {
  seconds: number | null;
  minutes: number | null;
  hours: number | null;
  originalField: string | null;
  originalValue: unknown;
}

export interface NormalizedWellness {
  date: string;
  available: boolean;
  source: "intervals.icu";
  steps: {
    value: number | null;
    originalField: string | null;
    originalValue: unknown;
  };
  sleep: NormalizedSleep;
  discoveredFields: string[];
  availableFields: string[];
  emptyFields: string[];
  raw?: WellnessRecord | null;
  reason?: "no_wellness_data";
}

class IntervalsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "IntervalsApiError";
  }
}

export function getSaoPauloDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Nao foi possivel determinar a data de Sao Paulo.");
  }

  return `${year}-${month}-${day}`;
}

export function getSaoPauloDateRange(days: number, date = new Date()) {
  const newest = getSaoPauloDate(date);
  const [year, month, day] = newest.split("-").map(Number);
  const newestUtc = Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
  const oldestUtc = newestUtc - Math.max(days - 1, 0) * 24 * 60 * 60 * 1000;
  const oldest = new Date(oldestUtc).toISOString().slice(0, 10);
  return { oldest, newest };
}

export function setIntervalsRuntimeEnv(env: unknown) {
  runtimeEnv = env && typeof env === "object" ? (env as RuntimeEnv) : null;
}

export async function fetchIntervalsWellness(date: string) {
  return fetchIntervalsWellnessRange(date, date);
}

export async function fetchIntervalsWellnessRange(oldest: string, newest: string) {
  const athleteId = readServerEnv("INTERVALS_ATHLETE_ID");
  const apiKey = readServerEnv("INTERVALS_API_KEY");

  if (!athleteId || !apiKey) {
    throw new IntervalsApiError(
      "Variaveis INTERVALS_ATHLETE_ID e INTERVALS_API_KEY sao obrigatorias.",
      500,
      "missing_intervals_env",
    );
  }

  const url = new URL(`${INTERVALS_BASE_URL}/athlete/${encodeURIComponent(athleteId)}/wellness`);
  url.searchParams.set("oldest", oldest);
  url.searchParams.set("newest", newest);

  const auth = encodeBase64(`API_KEY:${apiKey}`);
  const response = await fetch(url, {
    headers: {
      authorization: `Basic ${auth}`,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new IntervalsApiError(
      messageForStatus(response.status),
      response.status,
      codeForStatus(response.status),
    );
  }

  const payload = (await response.json()) as unknown;
  const records = Array.isArray(payload) ? payload : payload ? [payload] : [];
  return records.filter(isWellnessRecord);
}

function readServerEnv(key: string) {
  const runtimeValue = runtimeEnv?.[key];
  if (runtimeValue !== null && runtimeValue !== undefined && String(runtimeValue).trim() !== "") {
    return String(runtimeValue);
  }

  const processValue = process.env[key];
  if (processValue && processValue.trim() !== "") return processValue;

  return undefined;
}

function encodeBase64(value: string) {
  if (typeof btoa === "function") return btoa(value);
  return Buffer.from(value).toString("base64");
}

export function normalizeWellnessRange(oldest: string, newest: string, records: WellnessRecord[]) {
  const days = enumerateDateRange(oldest, newest);
  return {
    oldest,
    newest,
    days: days.map((date) => normalizeWellness(date, records)),
    source: "intervals.icu" as const,
  };
}

export function normalizeWellness(
  date: string,
  records: WellnessRecord[],
  includeRaw = false,
): NormalizedWellness {
  const record = findRecordForDate(records, date) ?? (records.length === 1 ? records[0] : null);

  if (!record) {
    return {
      date,
      available: false,
      reason: "no_wellness_data",
      source: "intervals.icu",
      steps: { value: null, originalField: null, originalValue: null },
      sleep: {
        seconds: null,
        minutes: null,
        hours: null,
        originalField: null,
        originalValue: null,
      },
      discoveredFields: [],
      availableFields: [],
      emptyFields: [],
      raw: includeRaw ? null : undefined,
    };
  }

  const discoveredFields = Object.keys(record).sort();

  const steps = findNumericField(record, ["steps", "stepCount", "step_count"]);
  const sleep = findSleep(record);

  return {
    date,
    available: true,
    source: "intervals.icu",
    steps: {
      value: steps?.value ?? null,
      originalField: steps?.field ?? null,
      originalValue: steps?.originalValue ?? null,
    },
    sleep,
    discoveredFields,
    availableFields: discoveredFields.filter(
      (field) => record[field] !== null && record[field] !== undefined,
    ),
    emptyFields: discoveredFields.filter(
      (field) => record[field] === null || record[field] === undefined,
    ),
    raw: includeRaw ? record : undefined,
  };
}

export function intervalsErrorResponse(error: unknown) {
  if (error instanceof IntervalsApiError) {
    return Response.json(
      { available: false, error: error.code, message: error.message },
      { status: error.status },
    );
  }

  return Response.json(
    {
      available: false,
      error: "intervals_unknown_error",
      message: "Falha inesperada ao consultar o Intervals.icu.",
    },
    { status: 500 },
  );
}

function findRecordForDate(records: WellnessRecord[], date: string) {
  return records.find((record) => {
    const value = record["id"] ?? record["date"] ?? record["day"];
    return typeof value === "string" && value.startsWith(date);
  });
}

function findNumericField(record: WellnessRecord, candidates: string[]) {
  for (const field of candidates) {
    const value = record[field];
    const numberValue = toNumber(value);
    if (numberValue !== null) {
      return { field, value: numberValue, originalValue: value };
    }
  }
  return null;
}

function findSleep(record: WellnessRecord): NormalizedSleep {
  const candidates = [
    "sleepSecs",
    "sleepSeconds",
    "sleep_seconds",
    "sleepDuration",
    "sleep_duration",
    "sleep",
  ];

  const found = findNumericField(record, candidates);
  if (!found) {
    return {
      seconds: null,
      minutes: null,
      hours: null,
      originalField: null,
      originalValue: null,
    };
  }

  const seconds = sleepValueToSeconds(found.field, found.value);
  const minutes = Math.round(seconds / 60);

  return {
    seconds,
    minutes,
    hours: Math.round((seconds / 3600) * 100) / 100,
    originalField: found.field,
    originalValue: found.originalValue,
  };
}

function sleepValueToSeconds(field: string, value: number) {
  const lowerField = field.toLowerCase();
  if (lowerField.includes("sec")) return Math.round(value);
  if (lowerField.includes("min")) return Math.round(value * 60);
  if (lowerField.includes("hour")) return Math.round(value * 3600);
  return value <= 24 ? Math.round(value * 3600) : Math.round(value);
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function isWellnessRecord(value: unknown): value is WellnessRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function enumerateDateRange(oldest: string, newest: string) {
  const [oldestYear, oldestMonth, oldestDay] = oldest.split("-").map(Number);
  const [newestYear, newestMonth, newestDay] = newest.split("-").map(Number);
  const cursor = Date.UTC(oldestYear ?? 0, (oldestMonth ?? 1) - 1, oldestDay ?? 1);
  const end = Date.UTC(newestYear ?? 0, (newestMonth ?? 1) - 1, newestDay ?? 1);
  const days: string[] = [];

  for (let value = cursor; value <= end; value += 24 * 60 * 60 * 1000) {
    days.push(new Date(value).toISOString().slice(0, 10));
  }

  return days;
}

function codeForStatus(status: number) {
  if (status === 401 || status === 403) return "invalid_intervals_credentials";
  if (status === 404) return "intervals_not_found";
  if (status === 429) return "intervals_rate_limited";
  if (status >= 500) return "intervals_unavailable";
  return "intervals_request_failed";
}

function messageForStatus(status: number) {
  if (status === 401 || status === 403) {
    return "Credencial ou Athlete ID invalido no Intervals.icu.";
  }
  if (status === 404) return "Endpoint ou dado nao encontrado no Intervals.icu.";
  if (status === 429) return "Rate limit atingido no Intervals.icu.";
  if (status >= 500) return "Intervals.icu indisponivel no momento.";
  return "Falha ao consultar o Intervals.icu.";
}
