import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Check, ChevronDown, Send } from "lucide-react";

import { CurrentActivityCard } from "@/components/yuri/CurrentActivityCard";
import { useStore } from "@/lib/store";
import {
  MONTHS,
  WEEKDAYS,
  WEEKDAYS_SHORT,
  blocksForDay,
  formatMinutes,
  greetingFor,
  toMinutes,
  type CurrentActivity,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { schedule, type ScheduleBlock } from "@/data/mockData";

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
    dailyHabits,
    dailyJournalEntries,
    todayGoal,
    todayGoalDone,
    weekMilestones,
    blockDone,
    dailyHabitDone,
    activityChecklistItemDone,
    extraActivityChecklistItems,
    toggleTodayGoal,
    toggleDailyHabit,
    toggleActivityChecklistItem,
    addActivityChecklistItem,
    addDailyJournalEntry,
  } = useStore();
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalDraft, setJournalDraft] = useState("");
  const [openMilestoneId, setOpenMilestoneId] = useState<string | null>(null);
  const [selectedWeekDay, setSelectedWeekDay] = useState(dayOfWeek);

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

  useEffect(() => {
    setSelectedWeekDay(dayOfWeek);
  }, [dayOfWeek]);

  const dailyHabitsDone = dailyHabits.filter((habit) => dailyHabitDone(habit.id)).length;
  const selectedDayBlocks = useMemo(
    () => blocksForDay(schedule, selectedWeekDay),
    [selectedWeekDay],
  );

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
        <p className="mt-3 text-sm leading-snug text-primary-foreground/80">Sua meta de hoje:</p>
        <button
          type="button"
          onClick={toggleTodayGoal}
          className={cn(
            "press relative mt-1.5 flex w-full items-start gap-2 overflow-hidden rounded-2xl px-3.5 py-3 text-left text-sm leading-snug shadow-[0_12px_28px_rgba(0,0,0,0.16)] transition-colors duration-300",
            todayGoalDone
              ? "bg-primary-foreground/20 text-primary-foreground/75"
              : "bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.42),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.22),rgba(0,125,98,0.28))] text-primary-foreground",
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
            {dailyHabitsDone} de {dailyHabits.length}
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {dailyHabits.map((habit) => {
            const done = dailyHabitDone(habit.id);
            return (
              <button
                key={habit.id}
                type="button"
                onClick={() => toggleDailyHabit(habit.id)}
                className={cn(
                  "press flex w-full items-start gap-3 rounded-2xl bg-elevated/50 px-4 py-3.5 text-left transition-colors duration-200",
                  done && "bg-primary/10",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-200",
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/35 text-transparent",
                  )}
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 text-sm font-medium leading-snug text-foreground",
                    done && "text-muted-foreground line-through",
                  )}
                >
                  {habit.title}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 rounded-2xl bg-elevated/50 p-3.5">
          <button
            type="button"
            onClick={() => setJournalOpen((open) => !open)}
            className="press flex w-full items-center justify-between gap-3 text-left"
            aria-expanded={journalOpen}
          >
            <span className="flex min-w-0 items-center gap-2 text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
              <BookOpen className="size-4 shrink-0" />
              DIÁRIO
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                journalOpen && "rotate-180",
              )}
            />
          </button>
          {journalOpen && (
            <div className="mt-3 space-y-3">
              <form
                className="space-y-2.5"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!journalDraft.trim()) return;
                  addDailyJournalEntry(journalDraft, formatMinutes(nowMinutes));
                  setJournalDraft("");
                }}
              >
                <textarea
                  value={journalDraft}
                  onChange={(event) => setJournalDraft(event.target.value)}
                  placeholder="Como foi seu dia?"
                  className="app-scrollbar h-24 w-full resize-none rounded-2xl bg-card/70 px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
                />
                <button
                  type="submit"
                  disabled={!journalDraft.trim()}
                  className="press flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                  aria-label="Enviar registro do diário"
                >
                  <Send className="size-4" />
                  Enviar
                </button>
              </form>

              {dailyJournalEntries.length > 0 && (
                <div className="app-scrollbar max-h-40 space-y-2 overflow-y-auto pr-1">
                  {dailyJournalEntries
                    .slice()
                    .reverse()
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="grid grid-cols-[44px_1fr] gap-3 rounded-2xl bg-card/60 px-3.5 py-3"
                      >
                        <span className="tabular text-xs font-medium text-primary">
                          {entry.time}
                        </span>
                        <p className="text-sm leading-snug text-foreground">{entry.text}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
          FOCO DA SEMANA
        </p>
        <div className="mt-4 space-y-2">
          {weekMilestones.map((milestone) => {
            const open = openMilestoneId === milestone.id;
            return (
              <button
                key={milestone.id}
                type="button"
                onClick={() => setOpenMilestoneId(open ? null : milestone.id)}
                className="press w-full rounded-2xl bg-elevated/50 px-4 py-3.5 text-left transition-colors duration-200"
                aria-expanded={open}
              >
                <span className="flex items-center justify-between gap-4">
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">
                    {milestone.title}
                  </span>
                  <span className="shrink-0 tabular text-xs font-medium text-primary">
                    {milestone.date}
                  </span>
                </span>
                {open && milestone.detail ? (
                  <span className="mt-2 block text-sm leading-snug text-muted-foreground">
                    {milestone.detail}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
          VISÃO DOS DIAS
        </p>
        <div className="app-scrollbar -mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {WEEKDAYS_SHORT.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setSelectedWeekDay(index)}
              className={cn(
                "press h-11 min-w-12 flex-1 rounded-2xl text-xs font-medium transition-colors",
                selectedWeekDay === index
                  ? "bg-primary text-primary-foreground"
                  : "bg-elevated/50 text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <ul className="app-scrollbar mt-4 max-h-64 divide-y divide-border/60 overflow-y-auto pr-1">
          {selectedDayBlocks.map((block) => (
            <li key={block.id} className="flex items-center gap-4 py-2.5">
              <span className="tabular w-11 shrink-0 text-sm text-muted-foreground">
                {block.startTime}
              </span>
              <span className="min-w-0 truncate text-sm">{block.title}</span>
            </li>
          ))}
          {selectedDayBlocks.length === 0 ? (
            <li className="py-3 text-sm text-muted-foreground">Dia livre de compromissos.</li>
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
