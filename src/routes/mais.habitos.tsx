import { createFileRoute } from "@tanstack/react-router";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/yuri/PageHeader";
import type { DailyHabit } from "@/data/mockData";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mais/habitos")({
  head: () => ({
    meta: [
      { title: "Hábitos · YURI OS" },
      {
        name: "description",
        content: "Configure hábitos, dias de execução e acompanhe sequência recente.",
      },
    ],
  }),
  component: MaisHabitosPage,
});

function MaisHabitosPage() {
  const {
    dailyHabitSettings,
    doneDailyHabits,
    todayKey,
    addDailyHabit,
    removeDailyHabit,
    updateDailyHabit,
  } = useStore();
  const [title, setTitle] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(WEEKDAY_DEFAULT);
  const [error, setError] = useState("");

  return (
    <div className="space-y-3">
      <PageHeader title="Hábitos" subtitle="Construção e frequência" back />

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
          NOVO HÁBITO
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const created = addDailyHabit(title, daysOfWeek);
            if (!created) {
              setError("Esse hábito já existe.");
              return;
            }
            setTitle("");
            setDaysOfWeek(WEEKDAY_DEFAULT);
            setError("");
          }}
        >
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError("");
            }}
            placeholder="Nome do hábito"
            className="h-12 w-full rounded-2xl bg-elevated/50 px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
          <WeekdaySelector value={daysOfWeek} onChange={setDaysOfWeek} />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <button
            type="submit"
            disabled={!title.trim()}
            className="press flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            <Plus className="size-4" />
            Adicionar hábito
          </button>
        </form>
      </section>

      <section className="space-y-2">
        {dailyHabitSettings.map((habit) => (
          <HabitConfigCard
            key={habit.id}
            habit={habit}
            doneDailyHabits={doneDailyHabits}
            todayKey={todayKey}
            onRemove={() => removeDailyHabit(habit.id)}
            onUpdate={(patch) => updateDailyHabit(habit.id, patch)}
            existingHabits={dailyHabitSettings}
          />
        ))}
      </section>
    </div>
  );
}

function HabitConfigCard({
  habit,
  doneDailyHabits,
  todayKey,
  existingHabits,
  onRemove,
  onUpdate,
}: {
  habit: DailyHabit;
  doneDailyHabits: Record<string, string[]>;
  todayKey: string;
  existingHabits: DailyHabit[];
  onRemove: () => void;
  onUpdate: (patch: { title?: string; daysOfWeek?: number[] }) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(habit.title);
  const [draftDays, setDraftDays] = useState<number[]>(habit.daysOfWeek ?? EVERY_DAY);
  const [error, setError] = useState("");
  const selectedDays = habit.daysOfWeek ?? EVERY_DAY;
  const historyDays = useMemo(
    () => buildHabitHistoryDays(habit.createdAt, todayKey),
    [habit.createdAt, todayKey],
  );
  const scheduledHistory = historyDays.filter((day) => day.dateKey && selectedDays.includes(day.dayOfWeek));
  const doneCount = scheduledHistory.filter((day) => doneDailyHabits[day.dateKey]?.includes(habit.id)).length;
  const completion = scheduledHistory.length > 0 ? Math.round((doneCount / scheduledHistory.length) * 100) : 0;

  const openEdit = () => {
    setDraft(habit.title);
    setDraftDays(habit.daysOfWeek ?? EVERY_DAY);
    setError("");
    setEditOpen(true);
  };

  return (
    <article className="rounded-3xl border border-border/60 bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold leading-tight">{habit.title}</h2>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {formatSelectedDays(selectedDays)}
          </p>
        </div>
        <div
          className="tabular grid size-11 shrink-0 place-items-center rounded-xl bg-elevated/60 text-base font-semibold text-primary"
          aria-label={`${habit.streakDays ?? 0} dias consecutivos`}
        >
          {habit.streakDays ?? 0}
        </div>
        <button
          type="button"
          onClick={openEdit}
          className="press grid size-9 shrink-0 place-items-center rounded-xl bg-elevated/45 text-muted-foreground"
          aria-label={`Editar ${habit.title}`}
        >
          <Pencil className="size-4" />
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-elevated/45 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
            PROGRESSÃO
          </p>
          <p className="tabular text-xs text-muted-foreground">{completion}%</p>
        </div>
        <HabitProgressGrid
          habit={habit}
          days={historyDays}
          selectedDays={selectedDays}
          doneDailyHabits={doneDailyHabits}
        />
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[430px] rounded-3xl border-border/60 bg-card p-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base">Editar hábito</DialogTitle>
            <DialogDescription>
              Ajuste o nome e os dias em que esse hábito deve acontecer.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const title = draft.trim();
              if (!title) return;
              const duplicated = existingHabits.some(
                (item) => item.id !== habit.id && normalizeLabel(item.title) === normalizeLabel(title),
              );
              if (duplicated) {
                setError("Esse hábito já existe.");
                return;
              }

              onUpdate({ title, daysOfWeek: draftDays });
              setError("");
              setEditOpen(false);
            }}
          >
            <input
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setError("");
              }}
              placeholder="Nome do hábito"
              className="h-12 w-full rounded-2xl bg-elevated/50 px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            <WeekdaySelector value={draftDays} onChange={setDraftDays} />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="grid grid-cols-[48px_1fr] gap-2">
              <button
                type="button"
                onClick={() => {
                  onRemove();
                  setEditOpen(false);
                }}
                className="press grid size-12 place-items-center rounded-2xl bg-elevated/55 text-muted-foreground"
                aria-label={`Remover ${habit.title}`}
              >
                <Trash2 className="size-4" />
              </button>
              <button
                type="submit"
                disabled={!draft.trim()}
                className="press flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                Salvar hábito
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function HabitProgressGrid({
  habit,
  days,
  selectedDays,
  doneDailyHabits,
}: {
  habit: DailyHabit;
  days: HistoryDay[];
  selectedDays: number[];
  doneDailyHabits: Record<string, string[]>;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [days.length, selectedDays, doneDailyHabits]);

  return (
    <div className="mt-3">
      <div className="grid grid-cols-7 gap-1 px-0.5 pb-2">
        {WEEKDAY_OPTIONS.map((day) => (
          <span
            key={day.value}
            className="text-center text-[9px] font-semibold tracking-[0.08em] text-muted-foreground/55"
          >
            {day.label.slice(0, 1)}
          </span>
        ))}
      </div>
      <div
        ref={scrollRef}
        className="app-scrollbar h-[64px] overflow-y-auto rounded-[4px] bg-background/30 px-1.5 pb-1 pt-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
      >
        <div className="grid grid-cols-7 gap-x-1 gap-y-1">
          {days.map((day) => {
            if (!day.dateKey) {
              return <div key={day.key} className="h-[16px] w-full" aria-hidden />;
            }

            const scheduled = selectedDays.includes(day.dayOfWeek);
            const done = doneDailyHabits[day.dateKey]?.includes(habit.id) ?? false;
            const waitingToday = scheduled && !done && day.dateKey === toDateKey(new Date());

            return (
              <div
                key={day.dateKey}
                className={cn(
                  "grid h-[16px] w-full place-items-center rounded-[4px] transition-colors duration-200",
                  !scheduled && "bg-card/45 opacity-55",
                  scheduled && !done && !waitingToday && "bg-destructive/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
                  waitingToday && "border border-muted-foreground/45 bg-transparent text-muted-foreground shadow-none",
                  scheduled && done && "bg-[linear-gradient(135deg,var(--color-primary),rgba(57,218,187,0.72))] shadow-[0_0_14px_rgba(52,211,181,0.18),inset_0_1px_0_rgba(255,255,255,0.20)]",
                )}
                title={`${day.label} · ${scheduled ? (done ? "realizado" : waitingToday ? "aguardando" : "não realizado") : "sem hábito"}`}
              >
                {waitingToday && <Clock className="size-2.5" strokeWidth={2.4} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekdaySelector({
  value,
  onChange,
}: {
  value: number[];
  onChange: (value: number[]) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {WEEKDAY_OPTIONS.map((day) => {
        const active = value.includes(day.value);
        return (
          <button
            key={day.value}
            type="button"
            onClick={() => {
              const next = active
                ? value.filter((item) => item !== day.value)
                : [...value, day.value].sort((a, b) => weekdaySortValue(a) - weekdaySortValue(b));
              onChange(next);
            }}
            className={cn(
              "press h-9 rounded-xl text-[11px] font-semibold transition-colors",
              active ? "bg-primary text-primary-foreground" : "bg-elevated/55 text-muted-foreground",
            )}
            aria-pressed={active}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
}

interface HistoryDay {
  key: string;
  dateKey?: string;
  dayOfWeek: number;
  label: string;
}

function buildHabitHistoryDays(createdAt: string | undefined, todayKey: string): HistoryDay[] {
  const today = dateKeyToDate(todayKey);
  const created = createdAt ? dateKeyToDate(createdAt) : addDays(today, -55);
  const start = created.getTime() > today.getTime() ? today : created;
  const days = Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1);

  const leadingPlaceholders = Array.from({ length: start.getDay() }, (_, index) => ({
    key: `empty-${toDateKey(start)}-${index}`,
    dayOfWeek: index,
    label: "",
  }));

  const history = Array.from({ length: days }, (_, index) => {
    const date = addDays(start, index);
    const weekday = WEEKDAY_OPTIONS.find((item) => item.value === date.getDay());
    return {
      key: toDateKey(date),
      dateKey: toDateKey(date),
      dayOfWeek: date.getDay(),
      label: `${weekday?.label ?? ""} ${date.getDate()}`,
    };
  });

  return [...leadingPlaceholders, ...history];
}

function dateKeyToDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatSelectedDays(days: number[]) {
  if (sameDays(days, EVERY_DAY)) return "Todos os dias";
  if (sameDays(days, WEEKDAY_DEFAULT)) return "Dias úteis";
  return WEEKDAY_OPTIONS.filter((day) => days.includes(day.value))
    .map((day) => day.label)
    .join(", ");
}

function sameDays(a: number[], b: number[]) {
  const left = [...a].sort((x, y) => weekdaySortValue(x) - weekdaySortValue(y)).join(",");
  const right = [...b].sort((x, y) => weekdaySortValue(x) - weekdaySortValue(y)).join(",");
  return left === right;
}

function weekdaySortValue(value: number) {
  return value;
}

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAY_DEFAULT = [1, 2, 3, 4, 5];
const WEEKDAY_OPTIONS = [
  { value: 0, label: "DOM" },
  { value: 1, label: "SEG" },
  { value: 2, label: "TER" },
  { value: 3, label: "QUA" },
  { value: 4, label: "QUI" },
  { value: 5, label: "SEX" },
  { value: 6, label: "SÁB" },
];
