import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Check, ChevronDown, Flag, Mic, Plus, Send, X } from "lucide-react";

import {
  CurrentActivityCard,
  getActivityChecklist,
  type ActivityChecklistItem,
} from "@/components/yuri/CurrentActivityCard";
import { useStore, type ManagedFront } from "@/lib/store";
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
import { type ScheduleBlock, type Task } from "@/data/mockData";

const BEDTIME_MINUTES = toMinutes("21:30");
const FREE_TIME_ID_PREFIX = "tempo-livre";
const RELIEF_NOTES_ACTIVITY_ID = "pessoal-notas-de-alivio";

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
    hydrated,
    context,
    scheduleBlocks,
    todayKey,
    nowMinutes,
    dayOfWeek,
    realNow,
    tasks,
    fronts,
    projects,
    dailyHabits,
    dailyJournalEntries,
    todayGoal,
    todayGoalDone,
    weekMilestones,
    routineRatingsToday,
    blockDone,
    dailyHabitDone,
    weekMilestoneDone,
    activityChecklistItemDone,
    activityChecklistItemCompletedAt,
    extraActivityChecklistItems,
    toggleTodayGoal,
    toggleDailyHabit,
    toggleWeekMilestone,
    toggleActivityChecklistItem,
    toggleTask,
    toggleProjectAction,
    addActivityChecklistItem,
    addActivityLearningEntry,
    addActivityLearningAudioEntry,
    setRoutineRating,
    addDailyJournalEntry,
    addDailyJournalAudioEntry,
  } = useStore();
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalDraft, setJournalDraft] = useState("");
  const [reliefNoteComposerOpen, setReliefNoteComposerOpen] = useState(false);
  const [reliefNoteDraft, setReliefNoteDraft] = useState("");
  const [reliefNoteQuick, setReliefNoteQuick] = useState(false);
  const [openMilestoneId, setOpenMilestoneId] = useState<string | null>(null);
  const [selectedWeekDay, setSelectedWeekDay] = useState(dayOfWeek);
  const [fastTasksDismissed, setFastTasksDismissed] = useState(false);
  const [isRecordingJournalAudio, setIsRecordingJournalAudio] = useState(false);
  const journalMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const journalAudioChunksRef = useRef<BlobPart[]>([]);
  const journalRecordingStreamRef = useRef<MediaStream | null>(null);

  const { current, dayBlocks } = context;
  const activeFreeTimeBlock = useMemo(
    () => buildActiveFreeTimeBlock(dayBlocks, dayOfWeek, nowMinutes, current),
    [current, dayBlocks, dayOfWeek, nowMinutes],
  );
  const finalFreeTimeBlock = useMemo(
    () => buildFinalFreeTimeBlock(dayBlocks, dayOfWeek, nowMinutes),
    [dayBlocks, dayOfWeek, nowMinutes],
  );
  const freeTimeBlock = activeFreeTimeBlock ?? finalFreeTimeBlock;
  const carouselBlocks = useMemo(
    () => buildCarouselBlocks(dayBlocks, activeFreeTimeBlock, finalFreeTimeBlock),
    [activeFreeTimeBlock, dayBlocks, finalFreeTimeBlock],
  );
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(current?.id ?? null);
  const focusedIndex = focusedBlockId
    ? carouselBlocks.findIndex((block) => block.id === focusedBlockId)
    : current
      ? carouselBlocks.findIndex((block) => block.id === current.id)
      : freeTimeBlock
        ? carouselBlocks.findIndex((block) => block.id === freeTimeBlock.id)
        : -1;
  const focusedBlock = focusedIndex >= 0 ? (carouselBlocks[focusedIndex] ?? null) : null;
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
    focusedBlock && isFreeTimeBlock(focusedBlock) && !current
      ? "current"
      : focusedBlock && current?.id === focusedBlock.id
        ? "current"
        : focusedBlock && toMinutes(focusedBlock.endTime) <= nowMinutes
          ? "past"
          : "future";
  const previousFocusedSlide = focusedIndex > 0 ? (carouselBlocks[focusedIndex - 1] ?? null) : null;
  const nextFocusedSlide =
    focusedIndex >= 0 && focusedIndex < carouselBlocks.length - 1
      ? (carouselBlocks[focusedIndex + 1] ?? null)
      : null;
  const activityIndicators = useMemo(
    () => buildActivityIndicators(carouselBlocks, current, focusedBlock, activeFreeTimeBlock),
    [activeFreeTimeBlock, carouselBlocks, current, focusedBlock],
  );
  const carouselExtraChecklistItems = useMemo(
    () => mergeReliefNotesIntoFreeTimeBlocks(carouselBlocks, extraActivityChecklistItems),
    [carouselBlocks, extraActivityChecklistItems],
  );
  const focusedExtraChecklistItems = useMemo(() => {
    if (!focusedCurrent) return [];

    const currentItems = extraActivityChecklistItems[focusedCurrent.id] ?? [];
    if (!isFreeTimeBlock(focusedCurrent)) return currentItems;

    return [
      ...(extraActivityChecklistItems[RELIEF_NOTES_ACTIVITY_ID] ?? []),
      ...currentItems,
    ];
  }, [extraActivityChecklistItems, focusedCurrent]);
  const fastTasks = useMemo(
    () =>
      buildFastTasks(
        carouselBlocks,
        extraActivityChecklistItems,
        tasks,
        fronts,
        projects,
        activityChecklistItemDone,
        activityChecklistItemCompletedAt,
        todayKey,
      ),
    [
      activityChecklistItemCompletedAt,
      activityChecklistItemDone,
      carouselBlocks,
      extraActivityChecklistItems,
      fronts,
      projects,
      tasks,
      todayKey,
    ],
  );
  const openFastTasks = fastTasks.filter((task) => !task.done).length;
  const showFastTasks = fastTasks.length > 0 && !(fastTasksDismissed && openFastTasks === 0);

  useEffect(() => {
    setFocusedBlockId(current?.id ?? activeFreeTimeBlock?.id ?? null);
  }, [activeFreeTimeBlock?.id, current?.id]);

  useEffect(() => {
    if (openFastTasks > 0) setFastTasksDismissed(false);
  }, [openFastTasks]);

  useEffect(() => {
    setSelectedWeekDay(dayOfWeek);
  }, [dayOfWeek]);

  useEffect(
    () => () => {
      const recorder = journalMediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      journalRecordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const orderedDailyHabits = useMemo(
    () => orderItemsByDoneLast(dailyHabits, (habit) => dailyHabitDone(habit.id)),
    [dailyHabitDone, dailyHabits],
  );
  const openDailyHabits = orderedDailyHabits.filter((habit) => !dailyHabitDone(habit.id)).length;
  const selectedDayBlocks = useMemo(
    () => blocksForDay(scheduleBlocks, selectedWeekDay),
    [scheduleBlocks, selectedWeekDay],
  );

  const weekdayLabel = WEEKDAYS[dayOfWeek];
  const fullDateLabel = `${realNow.getDate()} de ${MONTHS[realNow.getMonth()]}`;
  const handleAddReliefNote = () => {
    if (!reliefNoteDraft.trim()) return;
    addActivityChecklistItem(RELIEF_NOTES_ACTIVITY_ID, reliefNoteDraft.trim(), reliefNoteQuick);
    setReliefNoteDraft("");
    setReliefNoteQuick(false);
    setReliefNoteComposerOpen(false);
  };
  const handleToggleJournalAudioRecording = useCallback(async () => {
    const activeRecorder = journalMediaRecorderRef.current;
    if (activeRecorder?.state === "recording") {
      activeRecorder.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      journalRecordingStreamRef.current = stream;
      journalAudioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          journalAudioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(journalAudioChunksRef.current, { type: mimeType });
        const reader = new FileReader();

        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            addDailyJournalAudioEntry(reader.result, mimeType, formatMinutes(nowMinutes));
          }
        };

        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
        if (journalRecordingStreamRef.current === stream) {
          journalRecordingStreamRef.current = null;
        }
        journalMediaRecorderRef.current = null;
        journalAudioChunksRef.current = [];
        setIsRecordingJournalAudio(false);
      };

      journalMediaRecorderRef.current = recorder;
      setIsRecordingJournalAudio(true);
      recorder.start();
    } catch {
      setIsRecordingJournalAudio(false);
      journalRecordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      journalRecordingStreamRef.current = null;
      journalMediaRecorderRef.current = null;
      journalAudioChunksRef.current = [];
    }
  }, [addDailyJournalAudioEntry, nowMinutes]);
  if (!hydrated) {
    return (
      <div className="space-y-3">
        <section className="h-48 animate-pulse rounded-2xl bg-card" />
        <section className="h-[600px] animate-pulse rounded-3xl bg-card" />
      </div>
    );
  }

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
              "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.30),0_4px_10px_rgba(0,0,0,0.10)] transition-colors duration-300",
              todayGoalDone
                ? "bg-primary-foreground text-primary"
                : "bg-primary-foreground/18 text-transparent",
            )}
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          <span className={cn("min-w-0 font-medium", todayGoalDone && "line-through")}>
            {todayGoal}
          </span>
        </button>
      </header>

      {showFastTasks ? (
        <section className="rounded-3xl border-2 border-primary/35 bg-card p-5 shadow-[0_18px_40px_rgba(0,0,0,0.16)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium tracking-[0.18em] text-primary">
              TAREFAS RÁPIDAS
            </p>
            {openFastTasks === 0 ? (
              <button
                type="button"
                onClick={() => setFastTasksDismissed(true)}
                className="press grid size-8 shrink-0 place-items-center rounded-xl bg-elevated/60 text-muted-foreground"
                aria-label="Fechar tarefas rápidas concluídas"
              >
                <X className="size-4" />
              </button>
            ) : (
              <p className="tabular text-sm text-muted-foreground">{openFastTasks} abertas</p>
            )}
          </div>

          <div className="app-scrollbar mt-4 max-h-[218px] space-y-2 overflow-y-auto pr-1">
            {fastTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() =>
                  task.source === "task" ? toggleTask(task.id) : toggleActivityChecklistItem(task.id)
                }
                className="press flex w-full items-start gap-3 rounded-2xl bg-elevated/55 px-3.5 py-3 text-left"
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-200",
                    task.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-transparent",
                  )}
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-[13px] font-medium leading-snug text-foreground",
                      task.done && "text-muted-foreground line-through",
                    )}
                  >
                    {task.title}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                    {task.context}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <CurrentActivityCard
        context={focusedContext}
        project={focusedProject}
        done={focusedCurrent ? blockDone(focusedCurrent.id) : false}
        activityIndicators={activityIndicators}
        nowMinutes={nowMinutes}
        todayKey={todayKey}
        projects={projects}
        fronts={fronts}
        tasks={tasks}
        blockDoneById={blockDone}
        checklistItemDone={activityChecklistItemDone}
        checklistItemCompletedAt={activityChecklistItemCompletedAt}
        routineRatings={routineRatingsToday}
        extraChecklistItemsByActivity={carouselExtraChecklistItems}
        extraChecklistItems={focusedExtraChecklistItems}
        onToggleChecklistItem={toggleActivityChecklistItem}
        onToggleTask={toggleTask}
        onToggleProjectAction={toggleProjectAction}
        onAddChecklistItem={(title, priority) =>
          focusedCurrent && addActivityChecklistItem(focusedCurrent.id, title, priority)
        }
        onAddLearningNote={(text) =>
          focusedCurrent && addActivityLearningEntry(focusedCurrent.id, text, formatMinutes(nowMinutes))
        }
        onAddLearningAudio={(audioDataUrl, mimeType) =>
          focusedCurrent &&
          addActivityLearningAudioEntry(
            focusedCurrent.id,
            audioDataUrl,
            mimeType,
            formatMinutes(nowMinutes),
          )
        }
        onSetRoutineRating={setRoutineRating}
        viewMode={focusedMode}
        previousSlide={previousFocusedSlide}
        nextSlide={nextFocusedSlide}
        canNavigatePrevious={Boolean(previousFocusedSlide)}
        canNavigateNext={Boolean(nextFocusedSlide)}
        onNavigatePrevious={() =>
          setFocusedBlockId(previousFocusedSlide ? previousFocusedSlide.id : focusedBlockId)
        }
        onNavigateNext={() =>
          setFocusedBlockId(nextFocusedSlide ? nextFocusedSlide.id : focusedBlockId)
        }
      />

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
            CONSTRUÇÃO DE HÁBITOS
          </p>
          <p className="tabular text-sm text-muted-foreground">
            {openDailyHabits} abertos
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {orderedDailyHabits.map((habit) => {
            const done = dailyHabitDone(habit.id);
            const streakDays = (habit.streakDays ?? 0) + (done ? 1 : 0);
            return (
              <button
                key={habit.id}
                type="button"
                onClick={() => toggleDailyHabit(habit.id)}
                className={cn(
                  "press flex w-full items-center gap-3 rounded-2xl bg-elevated/50 px-4 py-3.5 text-left transition-colors duration-200",
                  done && "bg-primary/10",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-200",
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
                <span
                  className={cn(
                    "tabular grid size-10 shrink-0 place-items-center rounded-xl bg-card/65 text-sm font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
                    done && "bg-primary/15 text-primary",
                  )}
                  aria-label={`${streakDays} dias consecutivos`}
                >
                  {streakDays}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 rounded-2xl bg-primary/10 p-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.10)]">
          <button
            type="button"
            onClick={() => setJournalOpen((open) => !open)}
            className="press flex w-full items-center justify-between gap-3 rounded-2xl px-1 text-left"
            aria-expanded={journalOpen}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <BookOpen className="size-4" />
              </span>
              <span className="block min-w-0 truncate text-[11px] font-medium tracking-[0.18em] text-primary">
                BLOCO DE NOTAS
              </span>
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-primary transition-transform duration-200",
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
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleToggleJournalAudioRecording}
                    className={cn(
                      "press grid size-11 shrink-0 place-items-center rounded-2xl border transition-colors duration-300",
                      isRecordingJournalAudio
                        ? "border-primary bg-primary text-primary-foreground shadow-[0_0_22px_rgba(55,220,184,0.34)]"
                        : "border-border bg-card/70 text-muted-foreground",
                    )}
                    aria-label={isRecordingJournalAudio ? "Parar gravação" : "Gravar áudio"}
                  >
                    <Mic className={cn("size-4", isRecordingJournalAudio && "live-dot")} />
                  </button>
                  <button
                    type="submit"
                    disabled={!journalDraft.trim()}
                    className="press flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                    aria-label="Enviar registro do bloco de notas"
                  >
                    <Send className="size-4" />
                    Enviar
                  </button>
                </div>
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
                        {entry.type === "audio" && entry.audioDataUrl ? (
                          <div className="min-w-0">
                            <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                              Áudio
                            </p>
                            <audio
                              controls
                              src={entry.audioDataUrl}
                              className="h-9 w-full min-w-0"
                            />
                          </div>
                        ) : (
                          <p className="text-sm leading-snug text-foreground">{entry.text}</p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
        <p className="text-[11px] font-medium tracking-[0.18em] text-primary-foreground/70">
          FOCO DA SEMANA
        </p>
        <div className="mt-4 space-y-2">
          {weekMilestones.map((milestone) => {
            const open = openMilestoneId === milestone.id;
            const done = weekMilestoneDone(milestone.id);
            return (
              <button
                key={milestone.id}
                type="button"
                onClick={() => setOpenMilestoneId(open ? null : milestone.id)}
                className="press w-full overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.42),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.22),rgba(0,125,98,0.28))] px-3.5 py-3 text-left text-primary-foreground shadow-[0_12px_28px_rgba(0,0,0,0.16)] transition-colors duration-300"
                aria-expanded={open}
              >
                <span className="flex items-center gap-3">
                  <span className="shrink-0 rounded-full bg-primary-foreground/18 px-2.5 py-1 text-[11px] font-semibold tracking-[0.12em] text-primary-foreground/82">
                    {milestone.dayLabel}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-sm font-medium leading-snug",
                      done && "text-primary-foreground/68 line-through",
                    )}
                  >
                    {milestone.title}
                  </span>
                </span>
                {open ? (
                  <span className="mt-2.5 block">
                    {milestone.detail ? (
                      <span className="block text-sm leading-snug text-primary-foreground/78">
                        {milestone.detail}
                      </span>
                    ) : null}
                    <span
                      role="checkbox"
                      aria-checked={done}
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleWeekMilestone(milestone.id);
                        setOpenMilestoneId(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        event.stopPropagation();
                        toggleWeekMilestone(milestone.id);
                        setOpenMilestoneId(null);
                      }}
                      className={cn(
                        "press mt-3 flex h-10 w-full items-center justify-center rounded-2xl text-xs font-semibold tracking-[0.16em] transition-colors duration-200",
                        done
                          ? "bg-primary-foreground/18 text-primary-foreground/72"
                          : "bg-primary-foreground text-primary",
                      )}
                    >
                      {done ? "CONCLUÍDO" : "CONCLUIR"}
                    </span>
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

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+86px)] right-[max(1rem,calc((100vw-430px)/2+1rem))] z-40 flex flex-col items-end gap-2">
          {reliefNoteComposerOpen ? (
            <form
              className="rise w-[min(320px,calc(100vw-2rem))] rounded-3xl border border-border/60 bg-card p-3 shadow-[0_18px_46px_rgba(0,0,0,0.42)]"
              onSubmit={(event) => {
                event.preventDefault();
                handleAddReliefNote();
              }}
            >
              <textarea
                value={reliefNoteDraft}
                onChange={(event) => setReliefNoteDraft(event.target.value)}
                placeholder="Nova nota de alívio"
                className="app-scrollbar h-24 w-full resize-none rounded-2xl bg-elevated/60 px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setReliefNoteQuick((quick) => !quick)}
                  className={cn(
                    "press grid size-10 shrink-0 place-items-center rounded-2xl transition-colors duration-200",
                    reliefNoteQuick
                      ? "bg-primary text-primary-foreground"
                      : "bg-elevated/60 text-muted-foreground",
                  )}
                  aria-label="Marcar como tarefa rápida"
                  aria-pressed={reliefNoteQuick}
                >
                  <Flag className="size-4" />
                </button>
                <button
                  type="submit"
                  disabled={!reliefNoteDraft.trim()}
                  className="press flex h-10 flex-1 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                >
                  Adicionar
                </button>
              </div>
            </form>
          ) : null}
          <button
            type="button"
            onClick={() => setReliefNoteComposerOpen((open) => !open)}
            className="press grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_16px_34px_rgba(0,0,0,0.34)]"
            aria-label="Adicionar nota de alívio"
            aria-expanded={reliefNoteComposerOpen}
          >
            <Plus
              className={cn(
                "size-6 transition-transform duration-200",
                reliefNoteComposerOpen && "rotate-45",
              )}
            />
          </button>
      </div>
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

interface FastTask extends ActivityChecklistItem {
  context: string;
  source: "checklist" | "task";
  done?: boolean;
}

function buildFastTasks(
  dayBlocks: ScheduleBlock[],
  extraItemsByActivity: Record<string, ActivityChecklistItem[]>,
  tasks: Task[],
  fronts: ManagedFront[],
  projects: Project[],
  checklistItemDone: (id: string) => boolean,
  checklistItemCompletedAt: (id: string) => string | undefined,
  todayKey: string,
): FastTask[] {
  const reliefFastTasks = (extraItemsByActivity[RELIEF_NOTES_ACTIVITY_ID] ?? [])
    .filter((item) =>
      item.priority
        && checklistFastTaskIsVisibleToday(
          item,
          checklistItemDone,
          checklistItemCompletedAt,
          todayKey,
        ),
    )
    .map((item) => ({
      ...item,
      priority: true,
      context: "Pessoal · Notas de Alívio",
      source: "checklist" as const,
      done: checklistItemDone(item.id),
    }));

  const checklistFastTasks = dayBlocks.flatMap((block) => {
    const items = [...getActivityChecklist(block), ...(extraItemsByActivity[block.id] ?? [])];

    return items
      .filter((item) =>
        item.priority
          && checklistFastTaskIsVisibleToday(
            item,
            checklistItemDone,
            checklistItemCompletedAt,
            todayKey,
          ),
      )
      .map((item) => ({
        ...item,
        context: `${block.category} · ${block.subtitle ?? block.title}`,
        source: "checklist" as const,
        done: checklistItemDone(item.id),
      }));
  });

  const globalFastTasks = tasks
    .filter((task) => task.quick && taskIsVisibleToday(task, todayKey))
    .map((task) => ({
      id: task.id,
      title: task.title,
      priority: true,
      context: formatFatherId(task.fatherId, fronts, projects),
      source: "task" as const,
      done: Boolean(task.dueDate),
    }));

  return orderItemsByDoneLast(
    [...globalFastTasks, ...reliefFastTasks, ...checklistFastTasks],
    (task) => Boolean(task.done),
  );
}

function formatFatherId(fatherId: string, fronts: ManagedFront[], projects: Project[]) {
  const [areaId, frontId, projectId] = fatherId.split(".");
  const area = formatFatherSegment(areaId);
  const front = frontId ? fronts.find((item) => item.id === frontId) : undefined;
  const project = projectId ? projects.find((item) => item.id === projectId) : undefined;

  return [area, front?.title ?? formatFatherSegment(frontId), project?.title ?? formatFatherSegment(projectId)]
    .filter(Boolean)
    .join(" · ");
}

function formatFatherSegment(segment?: string) {
  if (!segment) return "";

  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function taskIsVisibleToday(task: Task, todayKey: string) {
  const visibleByStart = !task.visibleFrom || task.visibleFrom <= todayKey;
  const visibleByCompletion = !task.dueDate || task.dueDate === todayKey;
  return visibleByStart && visibleByCompletion;
}

function checklistFastTaskIsVisibleToday(
  item: ActivityChecklistItem,
  checklistItemDone: (id: string) => boolean,
  checklistItemCompletedAt: (id: string) => string | undefined,
  todayKey: string,
) {
  if (!checklistItemDone(item.id)) return true;
  const completedAt = checklistItemCompletedAt(item.id);
  return completedAt ? toDateKey(new Date(completedAt)) === todayKey : true;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function orderItemsByDoneLast<T>(items: T[], isDone: (item: T) => boolean) {
  return [...items].sort((a, b) => Number(isDone(a)) - Number(isDone(b)));
}

function buildActiveFreeTimeBlock(
  dayBlocks: ScheduleBlock[],
  dayOfWeek: number,
  nowMinutes: number,
  currentBlock: ScheduleBlock | null,
): ScheduleBlock | null {
  if (currentBlock) return null;

  const nextBlock = dayBlocks.find((block) => toMinutes(block.startTime) > nowMinutes) ?? null;
  const previousBlock = [...dayBlocks]
    .reverse()
    .find((block) => toMinutes(block.endTime) <= nowMinutes);
  const boundary = nextBlock ? toMinutes(nextBlock.startTime) : BEDTIME_MINUTES;
  const start = previousBlock ? toMinutes(previousBlock.endTime) : nowMinutes;
  const end = Math.max(nowMinutes + 1, boundary);

  if (end <= start) return null;

  const startTime = formatMinutes(start);
  const endTime = formatMinutes(end);

  return {
    id: `${FREE_TIME_ID_PREFIX}-ativo-${dayOfWeek}-${previousBlock?.id ?? "inicio"}-${nextBlock?.id ?? "sono"}`,
    dayOfWeek,
    startTime,
    endTime,
    category: "Tempo livre",
    title: "Aproveite seu tempo",
  };
}

function buildFinalFreeTimeBlock(
  dayBlocks: ScheduleBlock[],
  dayOfWeek: number,
  nowMinutes: number,
): ScheduleBlock | null {
  if (nowMinutes >= BEDTIME_MINUTES) return null;

  const firstPostBedtimeIndex = dayBlocks.findIndex(
    (block) => toMinutes(block.startTime) >= BEDTIME_MINUTES,
  );
  const blocksBeforeBedtime =
    firstPostBedtimeIndex >= 0 ? dayBlocks.slice(0, firstPostBedtimeIndex) : dayBlocks;
  const lastBlockBeforeBedtime = blocksBeforeBedtime.at(-1) ?? null;
  const freeStart = Math.max(nowMinutes, lastBlockBeforeBedtime ? toMinutes(lastBlockBeforeBedtime.endTime) : nowMinutes);

  if (freeStart >= BEDTIME_MINUTES) return null;

  return {
    id: `${FREE_TIME_ID_PREFIX}-final-${dayOfWeek}-${lastBlockBeforeBedtime?.id ?? "inicio"}-21h30`,
    dayOfWeek,
    startTime: formatMinutes(freeStart),
    endTime: "21:30",
    category: "Tempo livre",
    title: "Aproveite seu tempo",
  };
}

function buildCarouselBlocks(
  dayBlocks: ScheduleBlock[],
  activeFreeTimeBlock: ScheduleBlock | null,
  finalFreeTimeBlock: ScheduleBlock | null,
) {
  const blocks = [...dayBlocks];

  if (activeFreeTimeBlock) {
    const activeIndex = blocks.findIndex(
      (block) => toMinutes(block.startTime) >= toMinutes(activeFreeTimeBlock.endTime),
    );
    blocks.splice(activeIndex >= 0 ? activeIndex : blocks.length, 0, activeFreeTimeBlock);
  }

  if (finalFreeTimeBlock && finalFreeTimeBlock.endTime !== activeFreeTimeBlock?.endTime) {
    const finalIndex = blocks.findIndex((block) => toMinutes(block.startTime) >= BEDTIME_MINUTES);
    blocks.splice(finalIndex >= 0 ? finalIndex : blocks.length, 0, finalFreeTimeBlock);
  }

  return blocks;
}

function isFreeTimeBlock(block: ScheduleBlock | null) {
  return Boolean(block?.id.startsWith(FREE_TIME_ID_PREFIX));
}

function mergeReliefNotesIntoFreeTimeBlocks(
  carouselBlocks: ScheduleBlock[],
  extraItemsByActivity: Record<string, ActivityChecklistItem[]>,
) {
  const reliefNotes = extraItemsByActivity[RELIEF_NOTES_ACTIVITY_ID] ?? [];
  if (reliefNotes.length === 0) return extraItemsByActivity;

  return carouselBlocks.reduce(
    (itemsByActivity, block) => {
      if (!isFreeTimeBlock(block)) return itemsByActivity;

      itemsByActivity[block.id] = [
        ...reliefNotes,
        ...(itemsByActivity[block.id] ?? []),
      ];
      return itemsByActivity;
    },
    { ...extraItemsByActivity },
  );
}

function buildActivityIndicators(
  carouselBlocks: ScheduleBlock[],
  currentBlock: ScheduleBlock | null,
  focusedBlock: ScheduleBlock | null,
  activeFreeTimeBlock: ScheduleBlock | null,
) {
  return carouselBlocks.map((block) => ({
    id: block.id,
    kind: isFreeTimeBlock(block) ? ("free" as const) : ("activity" as const),
    selected: focusedBlock?.id === block.id,
    inProgress:
      currentBlock?.id === block.id || (!currentBlock && activeFreeTimeBlock?.id === block.id),
  }));
}
