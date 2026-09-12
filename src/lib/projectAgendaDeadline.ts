import type { Project, ScheduleBlock } from "@/data/mockData";

const AGENDA_LOOKAHEAD_DAYS = 7;

interface AgendaOccurrence {
  dateKey: string;
  startTime: string;
}

export function findProjectEffectiveDeadlineKey(
  project: Project,
  scheduleBlocks: ScheduleBlock[],
  todayKey: string,
  nowMinutes = 0,
) {
  return parseShortPortugueseDeadlineKey(project.deadline, todayKey) ??
    findProjectAgendaOccurrence(project, scheduleBlocks, todayKey, nowMinutes)?.dateKey ??
    null;
}

export function findProjectEffectiveDeadlineSortKey(
  project: Project,
  scheduleBlocks: ScheduleBlock[],
  todayKey: string,
  nowMinutes = 0,
) {
  const deadlineKey = parseShortPortugueseDeadlineKey(project.deadline, todayKey);
  if (deadlineKey) return `${deadlineKey}T00:00`;

  const occurrence = findProjectAgendaOccurrence(project, scheduleBlocks, todayKey, nowMinutes);
  return occurrence ? `${occurrence.dateKey}T${occurrence.startTime}` : null;
}

export function findProjectAgendaDeadlineKey(
  project: Project,
  scheduleBlocks: ScheduleBlock[],
  todayKey: string,
  nowMinutes = 0,
) {
  return findProjectAgendaOccurrence(project, scheduleBlocks, todayKey, nowMinutes)?.dateKey ?? null;
}

export function findProjectAgendaOccurrence(
  project: Project,
  scheduleBlocks: ScheduleBlock[],
  todayKey: string,
  nowMinutes = 0,
): AgendaOccurrence | null {
  if (project.deadline.trim()) return null;

  const projectKey = normalizeAgendaName(project.title);
  if (!projectKey) return null;

  const maxDateKey = addDaysToDateKey(todayKey, AGENDA_LOOKAHEAD_DAYS);

  return scheduleBlocks
    .filter((block) => {
      if (!block.dateKey || block.dateKey < todayKey || block.dateKey > maxDateKey) return false;
      if (block.dateKey === todayKey && toMinutes(block.startTime) < nowMinutes) return false;
      return getBlockNameCandidates(block).some((candidate) => normalizeAgendaName(candidate) === projectKey);
    })
    .sort((a, b) => {
      const dateComparison = (a.dateKey ?? "").localeCompare(b.dateKey ?? "");
      if (dateComparison !== 0) return dateComparison;
      return a.startTime.localeCompare(b.startTime);
    })
    .map((block) => ({ dateKey: block.dateKey, startTime: block.startTime }))[0] ?? null;
}

export function formatAgendaDeadlineDistance(dateKey: string, todayKey: string) {
  const diffInDays = diffDateKeysInDays(dateKey, todayKey);
  if (diffInDays === null) return null;
  if (diffInDays < 0) return `Atrasada há ${Math.abs(diffInDays)} dias`;
  if (diffInDays === 0) return "Entrega hoje";
  if (diffInDays === 1) return "Amanhã";
  return `Daqui ${diffInDays} dias`;
}

export function formatAgendaOccurrenceDistance(
  occurrence: AgendaOccurrence,
  todayKey: string,
  nowMinutes: number,
  options: { hourly?: boolean } = {},
) {
  if (!options.hourly) return formatAgendaDeadlineDistance(occurrence.dateKey, todayKey);

  const diffInDays = diffDateKeysInDays(occurrence.dateKey, todayKey);
  const startMinutes = toMinutes(occurrence.startTime);
  if (diffInDays === null || startMinutes === null) return formatAgendaDeadlineDistance(occurrence.dateKey, todayKey);

  const totalMinutes = diffInDays * 24 * 60 + startMinutes - nowMinutes;
  if (totalMinutes <= 0) return "Agora";
  if (totalMinutes < 60) return `Daqui ${totalMinutes} min`;
  if (totalMinutes < 24 * 60) return `Daqui ${formatHourDistance(totalMinutes)}`;
  if (diffInDays === 1) return "Amanhã";
  return `Daqui ${diffInDays} dias`;
}

export function projectUsesHourlyAgendaLabel(project: Project) {
  return normalizeAgendaName(project.category) === "alimentacao" ||
    normalizeAgendaName(project.frontTitle) === "alimentacao";
}

function getBlockNameCandidates(block: ScheduleBlock) {
  return [
    block.title,
    block.scope?.project,
    block.scope?.front && block.scope?.project ? `${block.scope.front} ${block.scope.project}` : undefined,
    block.title && block.subtitle ? `${block.title} ${block.subtitle}` : undefined,
    block.category && block.title ? `${block.category} ${block.title}` : undefined,
  ].filter(Boolean) as string[];
}

function normalizeAgendaName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function addDaysToDateKey(dateKey: string, days: number) {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function diffDateKeysInDays(leftKey: string, rightKey: string) {
  const left = parseDateKey(leftKey);
  const right = parseDateKey(rightKey);
  if (!left || !right) return null;
  return Math.ceil((left.getTime() - right.getTime()) / 86_400_000);
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (hours === undefined || minutes === undefined || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

function formatHourDistance(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h${String(remainingMinutes).padStart(2, "0")}`;
}

function parseShortPortugueseDeadlineKey(value: string, todayKey: string) {
  const match = value
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})\s+([a-zç.]+)$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = SHORT_MONTHS[match[2].replace(".", "")];
  if (!day || month === undefined) return null;

  const today = parseDateKey(todayKey) ?? new Date();
  const parsed = new Date(today.getFullYear(), month, day);
  parsed.setHours(0, 0, 0, 0);
  return toDateKey(parsed);
}

const SHORT_MONTHS: Record<string, number> = {
  jan: 0,
  fev: 1,
  mar: 2,
  abr: 3,
  mai: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  set: 8,
  out: 9,
  nov: 10,
  dez: 11,
};
