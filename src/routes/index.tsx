import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { CurrentActivityCard } from "@/components/yuri/CurrentActivityCard";
import { NextActivityCard } from "@/components/yuri/NextActivityCard";
import { DailyProgress } from "@/components/yuri/DailyProgress";
import { PriorityItem } from "@/components/yuri/PriorityItem";
import { TimelineItem } from "@/components/yuri/TimelineItem";
import { useStore } from "@/lib/store";
import {
  MONTHS,
  WEEKDAYS,
  formatMinutes,
  greetingFor,
  toMinutes,
  type CurrentActivity,
} from "@/lib/schedule";
import type { ScheduleBlock } from "@/data/mockData";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hoje · YURI OS" },
      {
        name: "description",
        content:
          "Painel operacional pessoal: veja o que fazer agora, prioridades do dia e rotina completa.",
      },
      { property: "og:title", content: "Hoje · YURI OS" },
      {
        property: "og:description",
        content: "Painel operacional pessoal: agora, prioridades e rotina do dia.",
      },
    ],
  }),
  component: HojePage,
});

function HojePage() {
  const {
    context,
    nowMinutes,
    dayOfWeek,
    realNow,
    projects,
    tasks,
    todayGoal,
    blockDone,
    activityChecklistItemDone,
    extraActivityChecklistItems,
    toggleTask,
    toggleBlock,
    toggleActivityChecklistItem,
    addActivityChecklistItem,
    addTask,
  } = useStore();
  const [draft, setDraft] = useState("");

  const { current, dayBlocks, past, upcoming } = context;
  const currentIndex = current ? dayBlocks.findIndex((block) => block.id === current.id) : -1;
  const nextBlockIndex = dayBlocks.findIndex((block) => toMinutes(block.startTime) > nowMinutes);
  const freeTimeIndex = current ? -1 : nextBlockIndex >= 0 ? nextBlockIndex : dayBlocks.length;
  const activeTimeIndex =
    freeTimeIndex >= 0 ? freeTimeIndex : dayBlocks.length > 0 ? dayBlocks.length : -1;
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(current?.id ?? null);
  const focusedIndex = focusedBlockId
    ? dayBlocks.findIndex((block) => block.id === focusedBlockId)
    : current
      ? currentIndex
      : -1;
  const activeFocusedIndex = focusedIndex >= 0 ? focusedIndex : activeTimeIndex;
  const focusedBlock = focusedIndex >= 0 ? (dayBlocks[focusedIndex] ?? null) : null;
  const focusedContext = useMemo(
    () => (focusedBlock ? buildFocusedActivityContext(context, focusedBlock, nowMinutes) : context),
    [context, focusedBlock, nowMinutes],
  );
  const focusedCurrent = focusedContext.current;
  const focusedProject = focusedCurrent?.projectId
    ? projects.find((p) => p.id === focusedCurrent.projectId)
    : undefined;
  const focusedMode =
    focusedBlock && current?.id === focusedBlock.id
      ? "current"
      : focusedBlock && toMinutes(focusedBlock.endTime) <= nowMinutes
        ? "past"
        : "future";
  const previousFocusedSlide =
    focusedBlock && freeTimeIndex >= 0 && activeFocusedIndex === freeTimeIndex
      ? "free"
      : focusedBlock && activeFocusedIndex > 0
        ? (dayBlocks[activeFocusedIndex - 1] ?? null)
        : !focusedBlock && activeTimeIndex > 0
          ? (dayBlocks[activeTimeIndex - 1] ?? null)
          : null;
  const nextFocusedSlide =
    focusedBlock && freeTimeIndex >= 0 && activeFocusedIndex === freeTimeIndex - 1
      ? "free"
      : focusedBlock && activeFocusedIndex >= 0 && activeFocusedIndex < dayBlocks.length - 1
        ? (dayBlocks[activeFocusedIndex + 1] ?? null)
        : !focusedBlock && activeTimeIndex >= 0 && activeTimeIndex < dayBlocks.length
          ? (dayBlocks[activeTimeIndex] ?? null)
          : null;

  useEffect(() => {
    setFocusedBlockId(current?.id ?? null);
  }, [current?.id]);

  const doneBlocks = dayBlocks.filter((b) => blockDone(b.id) || past.includes(b)).length;
  const prioritiesDone = tasks.filter((t) => t.status === "done").length;

  const weekdayLabel = WEEKDAYS[dayOfWeek];
  const fullDateLabel = `${realNow.getDate()} de ${MONTHS[realNow.getMonth()]}`;

  return (
    <div className="space-y-3">
      <header className="rise rounded-2xl bg-primary p-5 text-primary-foreground shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 max-w-[170px]">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {greetingFor(nowMinutes)}, Yuri
            </h1>
            <p className="mt-3 text-sm leading-snug text-primary-foreground/80">
              Sua meta de hoje:
              <br />
              <span className="font-medium text-primary-foreground">{todayGoal}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="tabular text-2xl font-semibold tracking-tight">
              {formatMinutes(nowMinutes)}
            </p>
            <p className="max-w-24 text-xs leading-tight text-primary-foreground/70">
              {fullDateLabel},
              <br />
              {weekdayLabel}
            </p>
          </div>
        </div>
      </header>

      <CurrentActivityCard
        context={focusedContext}
        project={focusedProject}
        done={focusedCurrent ? blockDone(focusedCurrent.id) : false}
        checklistItemDone={activityChecklistItemDone}
        extraChecklistItems={
          focusedCurrent ? (extraActivityChecklistItems[focusedCurrent.id] ?? []) : []
        }
        onToggleChecklistItem={toggleActivityChecklistItem}
        onAddChecklistItem={(title, priority) =>
          focusedCurrent && addActivityChecklistItem(focusedCurrent.id, title, priority)
        }
        viewMode={focusedMode}
        previousSlide={previousFocusedSlide}
        nextSlide={nextFocusedSlide}
        canNavigatePrevious={Boolean(previousFocusedSlide)}
        canNavigateNext={Boolean(nextFocusedSlide)}
        onNavigatePrevious={() =>
          setFocusedBlockId(
            focusedBlock && previousFocusedSlide === "free"
              ? null
              : focusedBlock
                ? (dayBlocks[Math.max(0, activeFocusedIndex - 1)]?.id ?? null)
                : previousFocusedSlide && previousFocusedSlide !== "free"
                  ? previousFocusedSlide.id
                  : null,
          )
        }
        onNavigateNext={() =>
          setFocusedBlockId(
            focusedBlock && nextFocusedSlide === "free"
              ? null
              : focusedBlock
                ? (dayBlocks[Math.min(dayBlocks.length - 1, activeFocusedIndex + 1)]?.id ?? null)
                : nextFocusedSlide && nextFocusedSlide !== "free"
                  ? nextFocusedSlide.id
                  : null,
          )
        }
      />

      <NextActivityCard blocks={upcoming.slice(0, 3)} />

      <DailyProgress
        blocksDone={doneBlocks}
        blocksTotal={dayBlocks.length}
        prioritiesDone={prioritiesDone}
        prioritiesTotal={tasks.length}
      />

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
            RESULTADOS DE HOJE
          </p>
          <p className="tabular text-sm text-muted-foreground">
            {prioritiesDone} de {tasks.length}
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {tasks.map((t, i) => (
            <PriorityItem key={t.id} task={t} index={i} onToggle={() => toggleTask(t.id)} />
          ))}
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            addTask(draft.trim());
            setDraft("");
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Adicionar resultado"
            className="h-12 min-w-0 flex-1 rounded-2xl bg-elevated/50 px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            className="press grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"
            aria-label="Adicionar"
          >
            <Plus className="size-5" />
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="mb-4 text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
          ROTINA
        </p>
        <ul className="relative space-y-2 before:absolute before:bottom-4 before:left-[7px] before:top-4 before:w-px before:bg-border/70">
          {dayBlocks.map((b) => {
            const state =
              current?.id === b.id
                ? "current"
                : toMinutes(b.endTime) <= nowMinutes
                  ? "past"
                  : "future";
            return (
              <TimelineItem
                key={b.id}
                block={b}
                state={state}
                done={blockDone(b.id)}
                onToggle={() => toggleBlock(b.id)}
              />
            );
          })}
          {dayBlocks.length === 0 ? (
            <p className="pl-8 text-sm text-muted-foreground">Nenhum bloco planejado para hoje.</p>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

function buildFocusedActivityContext(
  context: CurrentActivity,
  block: ScheduleBlock,
  nowMinutes: number,
): CurrentActivity {
  const start = toMinutes(block.startTime);
  const end = toMinutes(block.endTime);
  const progress =
    end > start ? Math.min(100, Math.max(0, ((nowMinutes - start) / (end - start)) * 100)) : 0;

  return {
    ...context,
    current: block,
    start,
    end,
    progress,
    remaining: Math.max(0, end - nowMinutes),
  };
}
