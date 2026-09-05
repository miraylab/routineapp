import { createFileRoute } from "@tanstack/react-router";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/yuri/PageHeader";
import type { WeekMilestone } from "@/data/mockData";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mais/foco-da-semana")({
  head: () => ({
    meta: [
      { title: "Foco da Semana · YURI OS" },
      {
        name: "description",
        content: "Configure os marcos importantes da semana e acompanhe conquistas.",
      },
    ],
  }),
  component: WeeklyFocusPage,
});

function WeeklyFocusPage() {
  const {
    weekMilestones,
    weekMilestoneDone,
    toggleWeekMilestone,
    addWeekMilestone,
    updateWeekMilestone,
    removeWeekMilestone,
  } = useStore();
  const [newOpen, setNewOpen] = useState(false);
  const currentWeekStart = useMemo(() => getCurrentWeekStartKey(new Date()), []);
  const currentWeekMilestones = useMemo(
    () =>
      weekMilestones.filter(
        (milestone) => (milestone.weekStart ?? currentWeekStart) === currentWeekStart,
      ),
    [currentWeekStart, weekMilestones],
  );
  const historyGroups = useMemo(
    () =>
      groupMilestonesByWeek(
        weekMilestones.filter(
          (milestone) =>
            (milestone.weekStart ?? currentWeekStart) < currentWeekStart &&
            weekMilestoneDone(milestone.id),
        ),
      ),
    [weekMilestoneDone, weekMilestones],
  );

  return (
    <div className="space-y-3">
      <PageHeader title="Foco da Semana" subtitle="Marcos e conquistas" back />

      <section className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-primary-foreground/70">
              SEMANA ATUAL
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {currentWeekMilestones.length} marcos
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="press grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-foreground/18 text-primary-foreground"
            aria-label="Adicionar foco da semana"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </section>

      <section className="space-y-2">
        {currentWeekMilestones.length > 0 ? (
          currentWeekMilestones.map((milestone) => (
            <WeeklyFocusCard
              key={milestone.id}
              milestone={milestone}
              done={weekMilestoneDone(milestone.id)}
              onToggle={() => toggleWeekMilestone(milestone.id)}
              onUpdate={(patch) => updateWeekMilestone(milestone.id, patch)}
              onRemove={() => removeWeekMilestone(milestone.id)}
            />
          ))
        ) : (
          <div className="rounded-3xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
            Nenhum foco configurado para esta semana.
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
          HISTÓRICO DE CONQUISTAS
        </p>
        <div className="mt-4 space-y-2">
          {historyGroups.length > 0 ? (
            historyGroups.map((group) => (
              <div key={group.weekStart} className="rounded-2xl bg-elevated/35 p-3">
                <p className="mb-2 text-[11px] font-medium tracking-[0.14em] text-muted-foreground">
                  SEMANA DE {formatWeekStart(group.weekStart)}
                </p>
                <div className="space-y-2">
                  {group.items.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="flex items-center gap-3 rounded-2xl bg-card/60 px-3.5 py-3"
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                        <Check className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium line-through">
                          {milestone.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {milestone.dayLabel}
                          {milestone.doneDate ? ` · concluído em ${formatDateKey(milestone.doneDate)}` : ""}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              As conquistas concluídas em semanas anteriores aparecem aqui.
            </p>
          )}
        </div>
      </section>

      <WeeklyFocusDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onSubmit={(input) => {
          const created = addWeekMilestone(input);
          if (created) setNewOpen(false);
        }}
      />
    </div>
  );
}

function WeeklyFocusCard({
  milestone,
  done,
  onToggle,
  onUpdate,
  onRemove,
}: {
  milestone: WeekMilestone;
  done: boolean;
  onToggle: () => void;
  onUpdate: (input: { title?: string; dayOfWeek?: number; detail?: string }) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-3xl border border-border/60 bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="shrink-0 rounded-full bg-primary/18 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-primary">
          {milestone.dayLabel}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            className={cn(
              "text-[15px] font-semibold leading-snug",
              done && "text-muted-foreground line-through",
            )}
          >
            {milestone.title}
          </h2>
          {milestone.detail ? (
            <p className="mt-2 text-sm leading-snug text-muted-foreground">{milestone.detail}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="press grid size-9 shrink-0 place-items-center rounded-xl bg-elevated/45 text-muted-foreground"
          aria-label={`Editar ${milestone.title}`}
        >
          <Pencil className="size-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "press mt-4 flex h-10 w-full items-center justify-center rounded-2xl text-xs font-semibold tracking-[0.16em] transition-colors duration-200",
          done ? "bg-elevated/60 text-muted-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        {done ? "CONCLUÍDO" : "CONCLUIR"}
      </button>

      <WeeklyFocusDialog
        milestone={milestone}
        open={open}
        onOpenChange={setOpen}
        onSubmit={(input) => {
          onUpdate(input);
          setOpen(false);
        }}
        onRemove={() => {
          onRemove();
          setOpen(false);
        }}
      />
    </article>
  );
}

function WeeklyFocusDialog({
  milestone,
  open,
  onOpenChange,
  onSubmit,
  onRemove,
}: {
  milestone?: WeekMilestone;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { title: string; dayOfWeek: number; detail?: string }) => void;
  onRemove?: () => void;
}) {
  const [title, setTitle] = useState(milestone?.title ?? "");
  const [dayOfWeek, setDayOfWeek] = useState(milestone?.dayOfWeek ?? dayLabelToDayOfWeek(milestone?.dayLabel));
  const [detail, setDetail] = useState(milestone?.detail ?? "");

  function resetDraft(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) return;
    setTitle(milestone?.title ?? "");
    setDayOfWeek(milestone?.dayOfWeek ?? dayLabelToDayOfWeek(milestone?.dayLabel));
    setDetail(milestone?.detail ?? "");
  }

  return (
    <Dialog open={open} onOpenChange={resetDraft}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[430px] rounded-3xl border-border/60 bg-card p-5">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-base">
            {milestone ? "Editar foco" : "Novo foco"}
          </DialogTitle>
          <DialogDescription>
            Defina o marco, o dia da semana e uma descrição curta.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) return;
            onSubmit({ title: title.trim(), dayOfWeek, detail: detail.trim() || undefined });
          }}
        >
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Marco da semana"
            className="h-12 w-full rounded-2xl bg-elevated/50 px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAY_OPTIONS.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => setDayOfWeek(day.value)}
                className={cn(
                  "press h-9 rounded-xl text-[11px] font-semibold transition-colors",
                  dayOfWeek === day.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-elevated/55 text-muted-foreground",
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
          <textarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder="Descrição"
            className="app-scrollbar h-24 w-full resize-none rounded-2xl bg-elevated/50 px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
          <div className={cn("grid gap-2", onRemove ? "grid-cols-[48px_1fr]" : "grid-cols-1")}>
            {onRemove ? (
              <button
                type="button"
                onClick={onRemove}
                className="press grid size-12 place-items-center rounded-2xl bg-elevated/55 text-muted-foreground"
                aria-label="Remover foco"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
            <button
              type="submit"
              disabled={!title.trim()}
              className="press flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            >
              Salvar
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const WEEKDAY_OPTIONS = [
  { value: 0, label: "DOM" },
  { value: 1, label: "SEG" },
  { value: 2, label: "TER" },
  { value: 3, label: "QUA" },
  { value: 4, label: "QUI" },
  { value: 5, label: "SEX" },
  { value: 6, label: "SÁB" },
];

function groupMilestonesByWeek(items: WeekMilestone[]) {
  const groups = items.reduce<Record<string, WeekMilestone[]>>((acc, milestone) => {
    const weekStart = milestone.weekStart ?? getCurrentWeekStartKey(new Date());
    acc[weekStart] = [...(acc[weekStart] ?? []), milestone];
    return acc;
  }, {});

  return Object.entries(groups)
    .map(([weekStart, groupItems]) => ({
      weekStart,
      items: groupItems.sort(
        (a, b) => (a.dayOfWeek ?? dayLabelToDayOfWeek(a.dayLabel)) - (b.dayOfWeek ?? dayLabelToDayOfWeek(b.dayLabel)),
      ),
    }))
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

function getCurrentWeekStartKey(date: Date) {
  const mondayOffset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  return toDateKey(monday);
}

function formatWeekStart(dateKey: string) {
  const date = dateKeyToDate(dateKey);
  return `${String(date.getDate()).padStart(2, "0")} ${MONTH_LABELS[date.getMonth()] ?? ""}`;
}

function formatDateKey(dateKey: string) {
  const date = dateKeyToDate(dateKey);
  return `${String(date.getDate()).padStart(2, "0")} ${MONTH_LABELS[date.getMonth()] ?? ""}`;
}

function dateKeyToDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayLabelToDayOfWeek(label?: string) {
  if (!label) return 0;
  const index = WEEKDAY_OPTIONS.findIndex((day) => day.label === label);
  return index >= 0 ? index : 0;
}

const MONTH_LABELS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
