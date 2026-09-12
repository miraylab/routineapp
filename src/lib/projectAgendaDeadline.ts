import type { Project, ScheduleBlock } from "@/data/mockData";

const AGENDA_LOOKAHEAD_DAYS = 7;

export function findProjectAgendaDeadlineKey(
  project: Project,
  scheduleBlocks: ScheduleBlock[],
  todayKey: string,
) {
  if (project.deadline.trim()) return null;

  const projectKey = normalizeAgendaName(project.title);
  if (!projectKey) return null;

  const maxDateKey = addDaysToDateKey(todayKey, AGENDA_LOOKAHEAD_DAYS);

  return scheduleBlocks
    .filter((block) => {
      if (!block.dateKey || block.dateKey < todayKey || block.dateKey > maxDateKey) return false;
      return getBlockNameCandidates(block).some((candidate) => normalizeAgendaName(candidate) === projectKey);
    })
    .sort((a, b) => {
      const dateComparison = (a.dateKey ?? "").localeCompare(b.dateKey ?? "");
      if (dateComparison !== 0) return dateComparison;
      return a.startTime.localeCompare(b.startTime);
    })[0]?.dateKey ?? null;
}

export function formatAgendaDeadlineDistance(dateKey: string, todayKey: string) {
  const diffInDays = diffDateKeysInDays(dateKey, todayKey);
  if (diffInDays === null) return null;
  if (diffInDays < 0) return `Atrasada há ${Math.abs(diffInDays)} dias`;
  if (diffInDays === 0) return "Entrega hoje";
  if (diffInDays === 1) return "Amanhã";
  return `Daqui ${diffInDays} dias`;
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
