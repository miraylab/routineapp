import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus } from "lucide-react";

import { CurrentActivityCard } from "@/components/yuri/CurrentActivityCard";
import { PriorityItem } from "@/components/yuri/PriorityItem";
import { useStore } from "@/lib/store";
import {
  MONTHS,
  WEEKDAYS,
  formatMinutes,
  greetingFor,
  toMinutes,
  type CurrentActivity,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";
import type { ScheduleBlock } from "@/data/mockData";

const BEDTIME_MINUTES = toMinutes("21:30");
const FREE_TIME_ID_PREFIX = "tempo-livre";

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
    todayGoalDone,
    blockDone,
    activityChecklistItemDone,
    extraActivityChecklistItems,
    toggleTask,
    toggleTodayGoal,
    toggleActivityChecklistItem,
    addActivityChecklistItem,
    addTask,
  } = useStore();
  const [draft, setDraft] = useState("");

  const { current, dayBlocks } = context;
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
  const freeTimeBlock = useMemo(
    () => buildFreeTimeBlock(dayBlocks, dayOfWeek, nowMinutes, nextBlockIndex),
    [dayBlocks, dayOfWeek, nextBlockIndex, nowMinutes],
  );
  const focusedContext = useMemo(
    () =>
      focusedBlock
        ? buildFocusedActivityContext(context, focusedBlock, nowMinutes)
        : freeTimeBlock
          ? buildFocusedActivityContext(
              {
                ...context,
                current: freeTimeBlock,
                next: context.next,
              },
              freeTimeBlock,
              nowMinutes,
            )
          : context,
    [context, focusedBlock, freeTimeBlock, nowMinutes],
  );
  const focusedCurrent = focusedContext.current;
  const focusedProject = focusedCurrent?.projectId
    ? projects.find((p) => p.id === focusedCurrent.projectId)
    : undefined;
  const focusedMode =
    !focusedBlock && freeTimeBlock
      ? "current"
      : focusedBlock && current?.id === focusedBlock.id
        ? "current"
        : focusedBlock && toMinutes(focusedBlock.endTime) <= nowMinutes
          ? "past"
          : "future";
  const previousFocusedSlide =
    focusedBlock && freeTimeIndex >= 0 && activeFocusedIndex === freeTimeIndex
      ? freeTimeBlock
      : focusedBlock && activeFocusedIndex > 0
        ? (dayBlocks[activeFocusedIndex - 1] ?? null)
        : !focusedBlock && activeTimeIndex > 0
          ? (dayBlocks[activeTimeIndex - 1] ?? null)
          : null;
  const nextFocusedSlide =
    focusedBlock && freeTimeIndex >= 0 && activeFocusedIndex === freeTimeIndex - 1
      ? freeTimeBlock
      : focusedBlock && activeFocusedIndex >= 0 && activeFocusedIndex < dayBlocks.length - 1
        ? (dayBlocks[activeFocusedIndex + 1] ?? null)
        : !focusedBlock && activeTimeIndex >= 0 && activeTimeIndex < dayBlocks.length
          ? (dayBlocks[activeTimeIndex] ?? null)
          : null;
  const activityIndicators = useMemo(
    () => buildActivityIndicators(dayBlocks, current, focusedBlock, freeTimeBlock, freeTimeIndex),
    [dayBlocks, current, focusedBlock, freeTimeBlock, freeTimeIndex],
  );

  useEffect(() => {
    setFocusedBlockId(current?.id ?? null);
  }, [current?.id]);

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
        <p className="mt-5 text-sm leading-snug text-primary-foreground/80">Sua meta de hoje:</p>
        <button
          type="button"
          onClick={toggleTodayGoal}
          className={cn(
            "press relative mt-1.5 flex w-full items-start gap-2 overflow-hidden rounded-2xl border px-3.5 py-3 text-left text-sm leading-snug shadow-[0_12px_28px_rgba(0,0,0,0.16)] transition-colors duration-300 before:pointer-events-none before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-primary-foreground/45",
            todayGoalDone
              ? "border-primary-foreground/45 bg-primary-foreground/20 text-primary-foreground/75"
              : "border-primary-foreground/45 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.42),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.22),rgba(0,125,98,0.28))] text-primary-foreground",
          )}
        >
          <span
            className={cn(
              "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-300",
              todayGoalDone
                ? "border-primary-foreground bg-primary-foreground text-primary"
                : "border-primary-foreground/55 text-transparent",
            )}
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          <span className={cn("min-w-0 font-medium", todayGoalDone && "line-through")}>
            {todayGoal}
          </span>
        </button>
      </header>

      <CurrentActivityCard
        context={focusedContext}
        project={focusedProject}
        done={focusedCurrent ? blockDone(focusedCurrent.id) : false}
        activityIndicators={activityIndicators}
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
            focusedBlock && isFreeTimeBlock(previousFocusedSlide)
              ? null
              : focusedBlock
                ? (dayBlocks[Math.max(0, activeFocusedIndex - 1)]?.id ?? null)
                : previousFocusedSlide && !isFreeTimeBlock(previousFocusedSlide)
                  ? previousFocusedSlide.id
                  : null,
          )
        }
        onNavigateNext={() =>
          setFocusedBlockId(
            focusedBlock && isFreeTimeBlock(nextFocusedSlide)
              ? null
              : focusedBlock
                ? (dayBlocks[Math.min(dayBlocks.length - 1, activeFocusedIndex + 1)]?.id ?? null)
                : nextFocusedSlide && !isFreeTimeBlock(nextFocusedSlide)
                  ? nextFocusedSlide.id
                  : null,
          )
        }
      />

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
            CONSTRUÇÃO DE HÁBITOS
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
            placeholder="Adicionar hábito"
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

function buildFreeTimeBlock(
  dayBlocks: ScheduleBlock[],
  dayOfWeek: number,
  nowMinutes: number,
  nextBlockIndex: number,
): ScheduleBlock | null {
  const nextBlock = nextBlockIndex >= 0 ? dayBlocks[nextBlockIndex] : null;
  const previousBlock = [...dayBlocks]
    .reverse()
    .find((block) => toMinutes(block.endTime) <= nowMinutes);
  const fallbackEnd = Math.max(nowMinutes + 1, BEDTIME_MINUTES);
  const start = previousBlock ? toMinutes(previousBlock.endTime) : nowMinutes;
  const end = nextBlock ? toMinutes(nextBlock.startTime) : fallbackEnd;

  if (end <= start) return null;

  const startTime = formatMinutes(start);
  const endTime = formatMinutes(end);

  return {
    id: `${FREE_TIME_ID_PREFIX}-${dayOfWeek}-${startTime}-${endTime}`,
    dayOfWeek,
    startTime,
    endTime,
    category: "Tempo livre",
    title: "Aproveite seu tempo",
  };
}

function isFreeTimeBlock(block: ScheduleBlock | null) {
  return Boolean(block?.id.startsWith(FREE_TIME_ID_PREFIX));
}

function buildActivityIndicators(
  dayBlocks: ScheduleBlock[],
  currentBlock: ScheduleBlock | null,
  focusedBlock: ScheduleBlock | null,
  freeTimeBlock: ScheduleBlock | null,
  freeTimeIndex: number,
) {
  const indicators = dayBlocks.map((block) => ({
    id: block.id,
    kind: "activity" as const,
    selected: focusedBlock?.id === block.id,
    inProgress: currentBlock?.id === block.id,
  }));

  if (freeTimeBlock && freeTimeIndex >= 0) {
    indicators.splice(freeTimeIndex, 0, {
      id: freeTimeBlock.id,
      kind: "free" as const,
      selected: !focusedBlock,
      inProgress: !currentBlock,
    });
  }

  return indicators;
}
