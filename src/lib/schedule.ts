import type { ScheduleBlock } from "@/data/mockData";

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export const pad = (n: number) => String(n).padStart(2, "0");

export const formatMinutes = (min: number) =>
  `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

export const formatDuration = (min: number) => {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}h` : `${h}h${pad(rest)}`;
};

export const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export const WEEKDAYS_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export const greetingFor = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
};

export const blocksForDay = (blocks: ScheduleBlock[], dayOfWeek: number) =>
  blocks
    .filter((x) => x.dayOfWeek === dayOfWeek)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

export interface CurrentActivity {
  current: ScheduleBlock | null;
  start: number | null;
  end: number | null;
  progress: number; // 0..100
  remaining: number; // minutos
  next: ScheduleBlock | null;
  upcoming: ScheduleBlock[];
  past: ScheduleBlock[];
  dayBlocks: ScheduleBlock[];
}

/**
 * Núcleo temporal do YURI OS.
 * Recebe a agenda, o dia da semana e o horário atual (em minutos)
 * e devolve todo o contexto do momento.
 */
export function getCurrentActivity(
  blocks: ScheduleBlock[],
  dayOfWeek: number,
  nowMinutes: number,
): CurrentActivity {
  const dayBlocks = blocksForDay(blocks, dayOfWeek);

  const current =
    dayBlocks.find(
      (x) =>
        nowMinutes >= toMinutes(x.startTime) &&
        nowMinutes < toMinutes(x.endTime),
    ) ?? null;

  const upcoming = dayBlocks.filter(
    (x) => toMinutes(x.startTime) > nowMinutes,
  );
  const past = dayBlocks.filter((x) => toMinutes(x.endTime) <= nowMinutes);

  const start = current ? toMinutes(current.startTime) : null;
  const end = current ? toMinutes(current.endTime) : null;

  const progress =
    start !== null && end !== null && end > start
      ? Math.min(100, Math.max(0, ((nowMinutes - start) / (end - start)) * 100))
      : 0;

  return {
    current,
    start,
    end,
    progress,
    remaining: end !== null ? end - nowMinutes : 0,
    next: upcoming[0] ?? null,
    upcoming,
    past,
    dayBlocks,
  };
}
