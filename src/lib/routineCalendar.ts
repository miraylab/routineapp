import type { Category, ScheduleBlock } from "@/data/mockData";

const GOOGLE_CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars";
const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";
const DEFAULT_ROUTINE_CALENDAR_ID =
  "c_b22070f5e671eb43eab776498c3ddd94daba14a6dd38a88bb66b8499b802478c@group.calendar.google.com";
const VITE_ROUTINE_CALENDAR_ID = import.meta.env.VITE_ROUTINE_CALENDAR_ID;

type RuntimeEnv = Record<string, unknown>;

let runtimeEnv: RuntimeEnv | null = null;

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
}

class RoutineCalendarError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "RoutineCalendarError";
  }
}

export function setRoutineCalendarRuntimeEnv(env: unknown) {
  runtimeEnv = env && typeof env === "object" ? (env as RuntimeEnv) : null;
}

export async function fetchRoutineBlocks(startDate: string, days: number) {
  const calendarId =
    readServerEnv("ROUTINE_CALENDAR_ID") ??
    readServerEnv("VITE_ROUTINE_CALENDAR_ID") ??
    DEFAULT_ROUTINE_CALENDAR_ID;
  const apiKey = readServerEnv("GOOGLE_CALENDAR_API_KEY");

  if (!calendarId || !apiKey) {
    const missing = [
      !calendarId ? "ROUTINE_CALENDAR_ID" : null,
      !apiKey ? "GOOGLE_CALENDAR_API_KEY" : null,
    ]
      .filter(Boolean)
      .join(" e ");
    throw new RoutineCalendarError(
      `Variavel ${missing} obrigatoria para ler a agenda ROTINA.`,
      500,
      "missing_google_calendar_env",
    );
  }

  const { timeMin, timeMax } = buildDateWindow(startDate, days);
  const url = new URL(`${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeZone", SAO_PAULO_TIME_ZONE);
  url.searchParams.set("maxResults", "250");

  const response = await fetch(url, { headers: { accept: "application/json" } });

  if (!response.ok) {
    throw new RoutineCalendarError(
      messageForStatus(response.status),
      response.status,
      codeForStatus(response.status),
    );
  }

  const payload = (await response.json()) as { items?: GoogleCalendarEvent[] };
  return (payload.items ?? []).map(mapCalendarEventToScheduleBlock).filter(Boolean) as ScheduleBlock[];
}

export function routineCalendarErrorResponse(error: unknown) {
  if (error instanceof RoutineCalendarError) {
    return Response.json(
      { available: false, error: error.code, message: error.message },
      { status: error.status },
    );
  }

  console.error("Unexpected routine calendar error", error);

  return Response.json(
    {
      available: false,
      error: "routine_calendar_unknown_error",
      message: "Falha inesperada ao consultar a agenda ROTINA.",
    },
    { status: 500 },
  );
}

function mapCalendarEventToScheduleBlock(event: GoogleCalendarEvent): ScheduleBlock | null {
  const start = event.start?.dateTime;
  const end = event.end?.dateTime;
  if (!start || !end) return null;

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;

  const parsedTitle = parseRoutineTitle(event.summary ?? "Rotina");

  return {
    id: `calendar:${event.id}`,
    dateKey: formatSaoPauloDateKey(startDate),
    dayOfWeek: getSaoPauloWeekday(startDate),
    startTime: formatSaoPauloTime(startDate),
    endTime: formatSaoPauloTime(endDate),
    category: parsedTitle.category,
    title: parsedTitle.title,
    subtitle: parsedTitle.subtitle,
    scope: parsedTitle.scope,
    description: event.description?.replace(/<[^>]+>/g, "").trim() || undefined,
    cardType: parsedTitle.cardType,
  };
}

function parseRoutineTitle(rawTitle: string): {
  category: Category;
  title: string;
  subtitle?: string;
  scope?: ScheduleBlock["scope"];
  cardType?: ScheduleBlock["cardType"];
} {
  const parts = rawTitle
    .split(/\s[-–—·|]\s/g)
    .map((part) => part.trim())
    .filter(Boolean);
  const first = parts[0] ?? rawTitle.trim();
  const second = parts[1];
  const third = parts[2];
  const category = normalizeCategory(first);

  if (category === "Estudos" && second && normalizeSegment(second) === "video") {
    return {
      category,
      title: "Aula",
      subtitle: "Video",
      scope: { area: category, front: "Aula" },
    };
  }

  if (category === "Saúde" || category === "Alimentação") {
    return {
      category,
      title: second ?? first,
      subtitle: third,
      scope: buildRoutineScope(category, second, third),
      cardType: "routine",
    };
  }

  if (parts.length === 1) {
    return {
      category,
      title: first,
      scope: buildRoutineScope(category, undefined, undefined),
      cardType: category === "Rotina" ? "routine" : undefined,
    };
  }

  return {
    category,
    title: third ?? second ?? first,
    subtitle: third ? second : undefined,
    scope: buildRoutineScope(category, second, third),
    cardType: category === "Rotina" ? "routine" : undefined,
  };
}

function buildRoutineScope(category: Category, front?: string, project?: string): ScheduleBlock["scope"] {
  return {
    area: category,
    ...(front ? { front } : {}),
    ...(project ? { project } : {}),
  };
}

function normalizeCategory(value: string): Category {
  const normalized = normalizeSegment(value);
  if (normalized === "michelin") return "Michelin";
  if (normalized === "miray") return "Miray";
  if (normalized === "estudos") return "Estudos";
  if (normalized === "saude" || normalized === "academia" || normalized === "corrida") return "Saúde";
  if (normalized === "alimentacao" || normalized === "almoco" || normalized === "jantar") return "Alimentação";
  if (normalized === "pessoal") return "Pessoal";
  if (normalized === "tempo-livre") return "Tempo livre";
  return "Rotina";
}

function normalizeSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildDateWindow(startDate: string, days: number) {
  const [year, month, day] = startDate.split("-").map(Number);
  const safeDays = Math.min(Math.max(days, 1), 31);
  const startUtc = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, 3, 0, 0);
  const endUtc = startUtc + safeDays * 24 * 60 * 60 * 1000;

  return {
    timeMin: new Date(startUtc).toISOString(),
    timeMax: new Date(endUtc).toISOString(),
  };
}

function getSaoPauloWeekday(date: Date) {
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: SAO_PAULO_TIME_ZONE,
    weekday: "short",
  }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(short);
}

function formatSaoPauloTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SAO_PAULO_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

function formatSaoPauloDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function readServerEnv(key: string) {
  const runtimeValue = runtimeEnv?.[key];
  if (runtimeValue !== null && runtimeValue !== undefined && String(runtimeValue).trim() !== "") {
    return String(runtimeValue);
  }

  const viteValue = key === "VITE_ROUTINE_CALENDAR_ID" ? VITE_ROUTINE_CALENDAR_ID : undefined;
  if (viteValue && String(viteValue).trim() !== "") return String(viteValue);

  const processValue = process.env[key];
  if (processValue && processValue.trim() !== "") return processValue;

  return undefined;
}

function messageForStatus(status: number) {
  if (status === 403) {
    return "A agenda ROTINA nao esta acessivel com a chave configurada.";
  }
  if (status === 404) {
    return "Agenda ROTINA nao encontrada pelo calendario configurado.";
  }
  return "Falha ao consultar o Google Calendar.";
}

function codeForStatus(status: number) {
  if (status === 403) return "routine_calendar_forbidden";
  if (status === 404) return "routine_calendar_not_found";
  return "routine_calendar_request_failed";
}
