import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
  type PointerEvent,
} from "react";
import { Check, Flag, Mic, Plus, Send, X } from "lucide-react";

import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";
import type { CurrentActivity } from "@/lib/schedule";
import { formatDuration } from "@/lib/schedule";
import type { Project, ProjectAction, ScheduleBlock, Task } from "@/data/mockData";
import type { ManagedFront } from "@/lib/store";
import { cn } from "@/lib/utils";

type ActivitySlide = ScheduleBlock;
const SLIDE_TRANSITION_MS = 1200;
const SLIDE_SETTLE_TRANSITION =
  "transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]";

interface Props {
  context: CurrentActivity;
  project?: Project | undefined;
  projects?: Project[];
  fronts?: ManagedFront[];
  tasks?: Task[];
  nowMinutes: number;
  todayKey: string;
  done: boolean;
  blockDoneById?: (id: string) => boolean;
  activityIndicators?: ActivityIndicator[];
  checklistItemDone: (id: string) => boolean;
  checklistItemCompletedAt?: (id: string) => string | undefined;
  extraChecklistItems: ActivityChecklistItem[];
  extraChecklistItemsByActivity?: Record<string, ActivityChecklistItem[]>;
  routineRatings?: Record<string, number>;
  onToggleChecklistItem: (id: string) => void;
  onToggleTask?: (id: string) => void;
  onToggleProjectAction?: (projectId: string, actionId: string) => void;
  onAddChecklistItem: (title: string, priority: boolean) => void;
  onMaterializeScheduleScope?: (block: ScheduleBlock) => Promise<void> | void;
  onAddLearningNote?: (text: string) => void;
  onAddLearningAudio?: (audioBlob: Blob, mimeType: string) => void;
  onSetRoutineRating?: (id: string, rating: number) => void;
  viewMode?: "current" | "past" | "future";
  previousSlide?: ActivitySlide | null;
  nextSlide?: ActivitySlide | null;
  canNavigatePrevious?: boolean;
  canNavigateNext?: boolean;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
}

export function CurrentActivityCard({
  context,
  project,
  projects = [],
  fronts = [],
  tasks = [],
  nowMinutes,
  todayKey,
  done,
  blockDoneById,
  activityIndicators = [],
  checklistItemDone,
  checklistItemCompletedAt,
  extraChecklistItems,
  extraChecklistItemsByActivity = {},
  routineRatings = {},
  onToggleChecklistItem,
  onToggleTask,
  onToggleProjectAction,
  onAddChecklistItem,
  onMaterializeScheduleScope,
  onAddLearningNote,
  onAddLearningAudio,
  onSetRoutineRating,
  viewMode = "current",
  previousSlide = null,
  nextSlide = null,
  canNavigatePrevious = false,
  canNavigateNext = false,
  onNavigatePrevious,
  onNavigateNext,
}: Props) {
  const [draft, setDraft] = useState("");
  const [draftPriority, setDraftPriority] = useState(false);
  const [learningDraft, setLearningDraft] = useState("");
  const [pendingLearningAudio, setPendingLearningAudio] = useState<{
    blob: Blob;
    mimeType: string;
    url: string;
  } | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isSettling, setIsSettling] = useState(false);
  const [isResettingTrack, setIsResettingTrack] = useState(false);
  const [edgeFeedback, setEdgeFeedback] = useState<"previous" | "next" | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  const checklistScrollRef = useRef<HTMLDivElement>(null);
  const firstPendingRef = useRef<HTMLButtonElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontalDragRef = useRef(false);
  const edgeFeedbackTimeoutRef = useRef<number | null>(null);
  const slideTransitionTimeoutRef = useRef<number | null>(null);
  const resetFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const [isRecordingLearningAudio, setIsRecordingLearningAudio] = useState(false);
  const { current } = context;
  const checklist = current
    ? orderChecklistItems(
        [...getActivityChecklist(current), ...extraChecklistItems],
        checklistItemDone,
        checklistItemCompletedAt,
        todayKey,
      )
    : [];
  const firstPendingId = checklist.find((item) => !checklistItemDone(item.id))?.id;
  const [stageWidth, setStageWidth] = useState(0);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const syncWidth = () => setStageWidth(stage.clientWidth);
    syncWidth();
    const observer = new ResizeObserver(syncWidth);
    observer.observe(stage);

    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const scrollRoot = checklistScrollRef.current;
    const firstPending = firstPendingRef.current;
    if (!scrollRoot || !firstPending) return;

    const positionAtFirstPending = () => {
      scrollRoot.scrollTop = Math.max(0, firstPending.offsetTop);
    };

    positionAtFirstPending();
    const frame = window.requestAnimationFrame(positionAtFirstPending);
    const timeout = window.setTimeout(positionAtFirstPending, 120);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [current?.id, checklist.length, firstPendingId]);

  useEffect(
    () => () => {
      if (edgeFeedbackTimeoutRef.current) {
        window.clearTimeout(edgeFeedbackTimeoutRef.current);
      }
      if (slideTransitionTimeoutRef.current) {
        window.clearTimeout(slideTransitionTimeoutRef.current);
      }
      if (resetFrameRef.current) {
        window.cancelAnimationFrame(resetFrameRef.current);
      }
      if (pendingLearningAudio) {
        URL.revokeObjectURL(pendingLearningAudio.url);
      }
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [pendingLearningAudio],
  );

  const handleToggleLearningAudioRecording = useCallback(async () => {
    const activeRecorder = mediaRecorderRef.current;
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
      recordingStreamRef.current = stream;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setPendingLearningAudio((currentAudio) => {
          if (currentAudio) URL.revokeObjectURL(currentAudio.url);
          return { blob, mimeType, url };
        });
        stream.getTracks().forEach((track) => track.stop());
        if (recordingStreamRef.current === stream) {
          recordingStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        setIsRecordingLearningAudio(false);
      };

      mediaRecorderRef.current = recorder;
      setIsRecordingLearningAudio(true);
      recorder.start();
    } catch {
      setIsRecordingLearningAudio(false);
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
    }
  }, []);

  const sendPendingLearningAudio = useCallback(() => {
    if (!pendingLearningAudio) return;
    onAddLearningAudio?.(pendingLearningAudio.blob, pendingLearningAudio.mimeType);
    URL.revokeObjectURL(pendingLearningAudio.url);
    setPendingLearningAudio(null);
  }, [onAddLearningAudio, pendingLearningAudio]);

  const deletePendingLearningAudio = useCallback(() => {
    if (!pendingLearningAudio) return;
    URL.revokeObjectURL(pendingLearningAudio.url);
    setPendingLearningAudio(null);
  }, [pendingLearningAudio]);

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (isInteractiveElement(event.target)) return;
    if (isSettling) return;

    dragStartRef.current = { x: event.clientX, y: event.clientY };
    isHorizontalDragRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const start = dragStartRef.current;
    if (!start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;

    if (!isHorizontalDragRef.current && Math.abs(deltaX) > 12) {
      isHorizontalDragRef.current = Math.abs(deltaX) > Math.abs(deltaY) * 1.25;
    }

    if (!isHorizontalDragRef.current) return;
    event.preventDefault();
    const blocked = (deltaX > 0 && !canNavigatePrevious) || (deltaX < 0 && !canNavigateNext);
    setDragX(blocked ? deltaX * 0.18 : deltaX);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLElement>) => {
    const start = dragStartRef.current;
    if (!start) return;

    const deltaX = event.clientX - start.x;
    const shouldNavigate = Math.abs(deltaX) > 42 && isHorizontalDragRef.current;
    const shouldGoPrevious = shouldNavigate && deltaX > 0 && canNavigatePrevious;
    const shouldGoNext = shouldNavigate && deltaX < 0 && canNavigateNext;
    const shouldHitPreviousEdge = shouldNavigate && deltaX > 0 && !canNavigatePrevious;
    const shouldHitNextEdge = shouldNavigate && deltaX < 0 && !canNavigateNext;

    if (shouldHitPreviousEdge) showEdgeFeedback("previous");
    if (shouldHitNextEdge) showEdgeFeedback("next");

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStartRef.current = null;
    isHorizontalDragRef.current = false;

    if (shouldGoPrevious || shouldGoNext) {
      const slideDistance = event.currentTarget.clientWidth + 12;
      setIsSettling(true);
      setDragX(shouldGoPrevious ? slideDistance : -slideDistance);

      slideTransitionTimeoutRef.current = window.setTimeout(() => {
        setIsResettingTrack(true);
        if (shouldGoPrevious) onNavigatePrevious?.();
        if (shouldGoNext) onNavigateNext?.();
        setDragX(0);
        slideTransitionTimeoutRef.current = null;
        resetFrameRef.current = window.requestAnimationFrame(() => {
          setIsSettling(false);
          resetFrameRef.current = window.requestAnimationFrame(() => {
            setIsResettingTrack(false);
            resetFrameRef.current = null;
          });
        });
      }, SLIDE_TRANSITION_MS);
      return;
    }

    setIsSettling(true);
    setDragX(0);
    slideTransitionTimeoutRef.current = window.setTimeout(() => {
      setIsSettling(false);
      slideTransitionTimeoutRef.current = null;
    }, SLIDE_TRANSITION_MS);
  };

  const showEdgeFeedback = (edge: "previous" | "next") => {
    if (edgeFeedbackTimeoutRef.current) {
      window.clearTimeout(edgeFeedbackTimeoutRef.current);
    }
    setEdgeFeedback(edge);
    edgeFeedbackTimeoutRef.current = window.setTimeout(() => {
      setEdgeFeedback(null);
      edgeFeedbackTimeoutRef.current = null;
    }, 900);
  };
  const slideStyle = {
    "--drag-x": `${dragX}px`,
    "--slide-gap": "12px",
    "--slide-width": `${stageWidth}px`,
  } as CSSProperties;
  const carouselTrackStyle = {
    ...slideStyle,
    transform: "translateX(calc(-1 * (var(--slide-width) + var(--slide-gap)) + var(--drag-x)))",
  } as CSSProperties;
  const isDragging = dragX !== 0 && !isSettling;
  const previousContext = previousSlide
    ? buildSlideContext(context, previousSlide, nowMinutes)
    : null;
  const nextContext = nextSlide ? buildSlideContext(context, nextSlide, nowMinutes) : null;
  const previousProject = findProjectForSlide(projects, previousSlide);
  const nextProject = findProjectForSlide(projects, nextSlide);
  const previousIndicators = previousSlide
    ? selectActivityIndicators(activityIndicators, previousSlide.id)
    : [];
  const nextIndicators = nextSlide ? selectActivityIndicators(activityIndicators, nextSlide.id) : [];

  return (
    <section
      ref={stageRef}
      className="rise relative h-[600px] touch-pan-y cursor-grab overflow-hidden active:cursor-grabbing"
      style={slideStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      {edgeFeedback ? (
        <div
          className={cn(
            "edge-feedback pointer-events-none absolute top-1/2 z-10 rounded-full bg-background/95 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-lg shadow-black/20",
            edgeFeedback === "previous" ? "left-4" : "right-4",
          )}
        >
          {edgeFeedback === "previous" ? "Nada antes" : "Nada depois"}
        </div>
      ) : null}

      <div
        className={cn(
          "flex h-full gap-[var(--slide-gap)]",
          isDragging || isResettingTrack ? "transition-none" : SLIDE_SETTLE_TRANSITION,
        )}
        style={carouselTrackStyle}
      >
        {previousContext && previousSlide ? (
          <ActivityCardPanel
            context={previousContext}
            project={previousProject}
            done={blockDoneById?.(previousSlide.id) ?? false}
            viewMode={getViewModeForSlide(previousSlide, context.current, nowMinutes)}
            activityIndicators={previousIndicators}
            checklistItemDone={checklistItemDone}
            checklistItemCompletedAt={checklistItemCompletedAt}
            todayKey={todayKey}
            extraChecklistItems={extraChecklistItemsByActivity[previousSlide.id] ?? []}
            scopedTaskItems={buildScopedTaskChecklist(previousSlide, previousProject, tasks, projects, fronts, todayKey)}
            routineRatings={routineRatings}
            onToggleChecklistItem={onToggleChecklistItem}
            onToggleTask={onToggleTask}
            onToggleProjectAction={onToggleProjectAction}
            onAddChecklistItem={onAddChecklistItem}
            onMaterializeScheduleScope={onMaterializeScheduleScope}
            onAddLearningNote={onAddLearningNote}
            onSetRoutineRating={onSetRoutineRating}
            className="pointer-events-none h-full w-full shrink-0"
          />
        ) : (
          <div className="h-full w-full shrink-0" />
        )}

        <ActivityCardPanel
          context={context}
          project={project}
          done={done}
          viewMode={viewMode}
          draft={draft}
          setDraft={setDraft}
          draftPriority={draftPriority}
          setDraftPriority={setDraftPriority}
          learningDraft={learningDraft}
          setLearningDraft={setLearningDraft}
          activityIndicators={activityIndicators}
          checklistItemDone={checklistItemDone}
          checklistItemCompletedAt={checklistItemCompletedAt}
          todayKey={todayKey}
          extraChecklistItems={extraChecklistItems}
          scopedTaskItems={buildScopedTaskChecklist(current, project, tasks, projects, fronts, todayKey)}
          routineRatings={routineRatings}
          onToggleChecklistItem={onToggleChecklistItem}
          onToggleTask={onToggleTask}
          onToggleProjectAction={onToggleProjectAction}
          onAddChecklistItem={onAddChecklistItem}
          onMaterializeScheduleScope={onMaterializeScheduleScope}
          onAddLearningNote={onAddLearningNote}
          onToggleLearningAudioRecording={handleToggleLearningAudioRecording}
          isRecordingLearningAudio={isRecordingLearningAudio}
          pendingLearningAudio={pendingLearningAudio}
          onSendPendingLearningAudio={sendPendingLearningAudio}
          onDeletePendingLearningAudio={deletePendingLearningAudio}
          onSetRoutineRating={onSetRoutineRating}
          checklistScrollRef={checklistScrollRef}
          firstPendingRef={firstPendingRef}
          firstPendingId={firstPendingId}
          className="h-full w-full shrink-0"
        />

        {nextContext && nextSlide ? (
          <ActivityCardPanel
            context={nextContext}
            project={nextProject}
            done={blockDoneById?.(nextSlide.id) ?? false}
            viewMode={getViewModeForSlide(nextSlide, context.current, nowMinutes)}
            activityIndicators={nextIndicators}
            checklistItemDone={checklistItemDone}
            checklistItemCompletedAt={checklistItemCompletedAt}
            todayKey={todayKey}
            extraChecklistItems={extraChecklistItemsByActivity[nextSlide.id] ?? []}
            scopedTaskItems={buildScopedTaskChecklist(nextSlide, nextProject, tasks, projects, fronts, todayKey)}
            routineRatings={routineRatings}
            onToggleChecklistItem={onToggleChecklistItem}
            onToggleTask={onToggleTask}
            onToggleProjectAction={onToggleProjectAction}
            onAddChecklistItem={onAddChecklistItem}
            onMaterializeScheduleScope={onMaterializeScheduleScope}
            onAddLearningNote={onAddLearningNote}
            onSetRoutineRating={onSetRoutineRating}
            className="pointer-events-none h-full w-full shrink-0"
          />
        ) : (
          <div className="h-full w-full shrink-0" />
        )}
      </div>
    </section>
  );
}

function ActivityCardPanel({
  context,
  project,
  done,
  viewMode,
  draft = "",
  setDraft,
  draftPriority = false,
  setDraftPriority,
  learningDraft = "",
  setLearningDraft,
  activityIndicators = [],
  checklistItemDone,
  checklistItemCompletedAt,
  todayKey,
  extraChecklistItems,
  scopedTaskItems = [],
  routineRatings,
  onToggleChecklistItem,
  onToggleTask,
  onToggleProjectAction,
  onAddChecklistItem,
  onMaterializeScheduleScope,
  onAddLearningNote,
  onToggleLearningAudioRecording,
  isRecordingLearningAudio = false,
  pendingLearningAudio = null,
  onSendPendingLearningAudio,
  onDeletePendingLearningAudio,
  onSetRoutineRating,
  checklistScrollRef,
  firstPendingRef,
  firstPendingId,
  className,
}: {
  context: CurrentActivity;
  project?: Project | undefined;
  done: boolean;
  viewMode: "current" | "past" | "future";
  draft?: string;
  setDraft?: (draft: string) => void;
  draftPriority?: boolean;
  setDraftPriority?: (priority: boolean | ((priority: boolean) => boolean)) => void;
  learningDraft?: string;
  setLearningDraft?: (draft: string) => void;
  activityIndicators?: ActivityIndicator[];
  checklistItemDone: (id: string) => boolean;
  checklistItemCompletedAt?: (id: string) => string | undefined;
  todayKey: string;
  extraChecklistItems: ActivityChecklistItem[];
  scopedTaskItems?: ActivityChecklistItem[];
  routineRatings: Record<string, number>;
  onToggleChecklistItem: (id: string) => void;
  onToggleTask?: (id: string) => void;
  onToggleProjectAction?: (projectId: string, actionId: string) => void;
  onAddChecklistItem: (title: string, priority: boolean) => void;
  onMaterializeScheduleScope?: (block: ScheduleBlock) => Promise<void> | void;
  onAddLearningNote?: (text: string) => void;
  onToggleLearningAudioRecording?: () => void;
  isRecordingLearningAudio?: boolean;
  pendingLearningAudio?: { blob: Blob; mimeType: string; url: string } | null;
  onSendPendingLearningAudio?: () => void;
  onDeletePendingLearningAudio?: () => void;
  onSetRoutineRating?: (id: string, rating: number) => void;
  checklistScrollRef?: RefObject<HTMLDivElement | null>;
  firstPendingRef?: RefObject<HTMLButtonElement | null>;
  firstPendingId?: string;
  className?: string;
}) {
  const { current, progress, remaining } = context;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [scopeCreationState, setScopeCreationState] = useState<
    Record<string, "creating" | "created" | "error">
  >({});
  const pendingScopeCreationsRef = useRef<Set<string>>(new Set());

  if (!current) return <div className={className} />;

  const activityHeading = getActivityHeading(current);
  const isRoutine = current.cardType === "routine";
  const isStudy = current.category === "Estudos";
  const checklistTitle = getOperationalBoxTitle(current);
  const routineRating = routineRatings[current.id];
  const titleFontSize = useFitText(titleRef, activityHeading.title, 28, 18);
  const checklist = getVisibleChecklistItems(
    orderChecklistItems(
      [...getActivityChecklist(current), ...extraChecklistItems, ...scopedTaskItems],
      (itemId) => {
        const item = scopedTaskItems.find((scopedItem) => scopedItem.id === itemId);
        return item ? Boolean(item.done) : checklistItemDone(itemId);
      },
    ),
    checklistItemDone,
    checklistItemCompletedAt,
    todayKey,
  );
  const hasConfigurationNotice = checklist.some((item) => item.source === "notice");
  const openChecklistItems = checklist.filter(
    (item) => item.source !== "notice" && !isOperationalItemDone(item, checklistItemDone),
  ).length;
  const viewLabel = viewMode === "past" ? "ANTERIOR" : viewMode === "future" ? "PRÓXIMA" : "AGORA";
  const statusLabel = done
    ? "Concluído"
    : viewMode === "past"
      ? "Finalizada"
      : viewMode === "future"
        ? "Planejada"
        : "Em andamento";
  const duration = context.start !== null && context.end !== null ? context.end - context.start : 0;
  const timeInfo =
    viewMode === "current"
      ? `Restam ${formatDuration(remaining)}`
      : viewMode === "future"
        ? `Duração ${formatDuration(duration)}`
        : "Finalizada";
  const hasDeliveryDetail = Boolean(project?.deadline);
  const isCurrentLiveCard = viewMode === "current" && !done;

  return (
    <div
      className={cn(
        "flex h-full w-full shrink-0 flex-col overflow-hidden rounded-3xl border bg-card p-6 transition-[border-color,box-shadow] duration-300",
        isCurrentLiveCard
          ? "border-2 border-primary/45 shadow-[0_0_0_1px_rgba(55,220,184,0.14),0_18px_42px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.03)]"
          : "border-border/60",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "shrink-0 whitespace-nowrap text-[11px] font-medium tracking-[0.18em]",
            isCurrentLiveCard ? "text-primary" : "text-muted-foreground",
          )}
        >
          {viewLabel}
        </p>
        <StatusBadge tone={isCurrentLiveCard ? "active" : "neutral"}>
          <span
            className={cn(
              "size-1.5 rounded-full bg-current",
              viewMode === "current" && !done && "live-dot",
            )}
          />
          {statusLabel}
        </StatusBadge>
      </div>

      {activityHeading.overline ? (
        <p className="mt-4 truncate whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {activityHeading.overline}
        </p>
      ) : (
        <div className="mt-4" />
      )}
      <h2
        ref={titleRef}
        className={cn(
          "overflow-hidden whitespace-nowrap font-semibold leading-tight tracking-tight",
          activityHeading.overline ? "mt-1.5" : "mt-0",
        )}
        style={{ fontSize: titleFontSize }}
      >
        {activityHeading.title}
      </h2>

      {hasDeliveryDetail ? (
        <div className="mt-4 flex">
          <StatusBadge tone="active" className="shrink-0">
            {formatDeadlineDistance(project.deadline)}
          </StatusBadge>
        </div>
      ) : null}

      <div
        className={cn(
          "tabular flex items-baseline justify-between text-sm",
          hasDeliveryDetail ? "mt-4" : "mt-5",
        )}
      >
        <span className="shrink-0 whitespace-nowrap text-muted-foreground">
          {current.startTime} — {current.endTime}
        </span>
        <span className="min-w-0 truncate whitespace-nowrap pl-3 text-right text-xs text-muted-foreground">
          {timeInfo}
        </span>
      </div>
      <ProgressBar value={progress} className="mt-1.5" size="md" />

      {isRoutine ? (
        <RoutineReviewBox
          current={current}
          rating={routineRating}
          onSetRating={(rating) => onSetRoutineRating?.(current.id, rating)}
        />
      ) : (
        <div className="mt-5 flex min-h-0 flex-1 flex-col rounded-2xl bg-elevated/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
              {hasConfigurationNotice ? "ATENÇÃO" : checklistTitle}
            </p>
            {!hasConfigurationNotice ? (
              <span className="tabular text-xs font-medium text-muted-foreground">
                {openChecklistItems} abertas
              </span>
            ) : null}
          </div>
          <div
            ref={checklistScrollRef}
            className="app-scrollbar relative mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
          >
            {checklist.length > 0 ? (
              checklist.map((item) => {
                const itemDone = isOperationalItemDone(item, checklistItemDone);
                if (item.source === "notice") {
                  const canConfigure = Boolean(item.configureBlock && onMaterializeScheduleScope);
                  const creationState = scopeCreationState[item.id];
                  const creating = creationState === "creating";
                  const created = creationState === "created";
                  const NoticeElement = canConfigure ? "button" : "div";
                  return (
                    <NoticeElement
                      key={item.id}
                      type={canConfigure ? "button" : undefined}
                      disabled={canConfigure ? creating || created : undefined}
                      onClick={async () => {
                        if (!item.configureBlock || !onMaterializeScheduleScope || creating || created) return;
                        if (pendingScopeCreationsRef.current.has(item.id)) return;
                        pendingScopeCreationsRef.current.add(item.id);
                        setScopeCreationState((state) => ({ ...state, [item.id]: "creating" }));
                        try {
                          await onMaterializeScheduleScope(item.configureBlock);
                          setScopeCreationState((state) => ({ ...state, [item.id]: "created" }));
                        } catch {
                          setScopeCreationState((state) => ({ ...state, [item.id]: "error" }));
                        } finally {
                          pendingScopeCreationsRef.current.delete(item.id);
                        }
                      }}
                      className={cn(
                        "relative flex w-full items-start gap-3 rounded-2xl bg-card/70 px-3.5 py-3 text-left",
                        canConfigure && "press cursor-pointer",
                        created && "bg-primary/10",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-200",
                          created
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {created ? <Check className="size-3.5" strokeWidth={3} /> : <Plus className="size-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1 text-[13px] leading-snug text-muted-foreground">
                        {created
                          ? "Estrutura criada. As tarefas certas já podem ser vinculadas."
                          : creating
                            ? "Criando estrutura..."
                            : creationState === "error"
                              ? "Não consegui criar agora. Tente novamente."
                              : item.title}
                        {item.context ? (
                          <span className="mt-1 block text-[11px] leading-snug text-muted-foreground/80">
                            {item.context}
                          </span>
                        ) : null}
                      </span>
                    </NoticeElement>
                  );
                }

                return (
                  <button
                    key={item.id}
                    ref={item.id === firstPendingId ? firstPendingRef : undefined}
                    type="button"
                    onClick={() => {
                      if (item.source === "task" && item.taskId) {
                        onToggleTask?.(item.taskId);
                        return;
                      }
                      if (item.source === "project-action" && item.taskId && item.projectId) {
                        onToggleProjectAction?.(item.projectId, item.taskId);
                        return;
                      }
                      onToggleChecklistItem(item.id);
                    }}
                    className="press relative flex w-full items-start gap-3 rounded-2xl bg-card/70 px-3.5 py-3 pr-7 text-left"
                  >
                    {item.priority && !itemDone ? (
                      <span className="absolute right-3 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary" />
                    ) : null}
                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-300",
                        itemDone
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-transparent",
                      )}
                    >
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 text-[13px] leading-snug",
                        itemDone && "text-muted-foreground line-through",
                      )}
                    >
                      {item.title}
                      {item.context ? (
                        <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                          {item.context}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="flex h-full items-center rounded-2xl bg-card/70 px-3.5 py-3 text-[13px] leading-snug text-muted-foreground">
                Nenhum item nesta atividade.
              </div>
            )}
          </div>
          {hasConfigurationNotice ? null : isStudy ? (
            <div className="mt-2 space-y-2">
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!learningDraft.trim()) return;
                  onAddLearningNote?.(learningDraft.trim());
                  setLearningDraft?.("");
                }}
              >
                <input
                  value={learningDraft}
                  onChange={(event) => setLearningDraft?.(event.target.value)}
                  placeholder="Comentar aprendizado"
                  className="h-11 min-w-0 flex-1 rounded-2xl bg-card/70 px-3.5 text-[13px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={onToggleLearningAudioRecording}
                  disabled={Boolean(pendingLearningAudio)}
                  className={cn(
                    "press grid size-11 shrink-0 place-items-center rounded-2xl border transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-45",
                    isRecordingLearningAudio
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_0_22px_rgba(55,220,184,0.34)]"
                      : "border-border bg-card/70 text-muted-foreground",
                  )}
                  aria-label={isRecordingLearningAudio ? "Parar gravação" : "Gravar áudio"}
                >
                  <Mic className={cn("size-4", isRecordingLearningAudio && "live-dot")} />
                </button>
                <button
                  type="submit"
                  disabled={!learningDraft.trim()}
                  className="press grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                  aria-label="Enviar aprendizado"
                >
                  <Send className="size-4" />
                </button>
              </form>
              {pendingLearningAudio ? (
                <div className="grid w-full grid-cols-[minmax(0,1fr)_40px_40px] items-center gap-2 overflow-hidden rounded-2xl bg-card/70 p-2">
                  <audio
                    controls
                    src={pendingLearningAudio.url}
                    className="h-9 w-full min-w-0 max-w-full"
                  />
                  <button
                    type="button"
                    onClick={onDeletePendingLearningAudio}
                    className="press grid size-10 place-items-center rounded-2xl border border-border text-muted-foreground"
                    aria-label="Apagar áudio"
                  >
                    <X className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onSendPendingLearningAudio}
                    className="press grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground"
                    aria-label="Enviar áudio"
                  >
                    <Send className="size-4" />
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <form
              className="mt-2 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.trim()) return;
                onAddChecklistItem(draft.trim(), draftPriority);
                setDraft?.("");
                setDraftPriority?.(false);
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft?.(event.target.value)}
                placeholder="Adicionar item"
                className="h-11 min-w-0 flex-1 rounded-2xl bg-card/70 px-3.5 text-[13px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setDraftPriority?.((value) => !value)}
                className={cn(
                  "press grid size-11 shrink-0 place-items-center rounded-2xl border",
                  draftPriority ? "border-primary text-primary" : "border-border text-muted-foreground",
                )}
                aria-label="Marcar novo item como prioridade"
              >
                <Flag className="size-4" />
              </button>
              <button
                type="submit"
                className="press grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"
                aria-label="Adicionar item ao checklist"
              >
                <Plus className="size-4" />
              </button>
            </form>
          )}
        </div>
      )}

      {activityIndicators.length > 0 ? (
        <ActivityPositionDots indicators={activityIndicators} />
      ) : null}
    </div>
  );
}

function isInteractiveElement(target: EventTarget | null) {
  return (
    target instanceof HTMLElement && Boolean(target.closest("button, input, textarea, select, a"))
  );
}

function RoutineReviewBox({
  current,
  rating,
  onSetRating,
}: {
  current: NonNullable<CurrentActivity["current"]>;
  rating: number | undefined;
  onSetRating: (rating: number) => void;
}) {
  const items = current.routineItems ?? [];
  const ratingOptions = [0, 1, 2, 3, 4, 5];

  return (
    <div className="mt-5 flex min-h-0 flex-1 flex-col rounded-2xl bg-elevated/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
          {getOperationalBoxTitle(current)}
        </p>
        {rating !== undefined ? (
          <span className="tabular text-xs font-medium text-primary">
            {rating === 0 ? "X" : `${rating}/5`}
          </span>
        ) : null}
      </div>

      <div className="app-scrollbar mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item}
              className="flex w-full items-start gap-3 rounded-2xl bg-card/70 px-3.5 py-3 text-left"
            >
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="min-w-0 flex-1 text-[13px] leading-snug text-foreground">
                {item}
              </span>
            </div>
          ))
        ) : (
          <div className="flex h-full items-center rounded-2xl bg-card/70 px-3.5 py-3 text-[13px] leading-snug text-muted-foreground">
            Rotina sem itens cadastrados.
          </div>
        )}
      </div>

      <div className="mt-2">
        <div className="grid grid-cols-6 gap-1">
          {ratingOptions.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onSetRating(value)}
              className={cn(
                "press h-9 rounded-2xl text-sm font-semibold transition-colors duration-200",
                rating === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-card/70 text-muted-foreground",
              )}
              aria-label={
                value === 0
                  ? "Marcar rotina como sem execução"
                  : `Avaliar rotina com nota ${value} de 5`
              }
            >
              {value === 0 ? "X" : value}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          AVALIAÇÃO
        </p>
      </div>
    </div>
  );
}

function getOperationalBoxTitle(block: ScheduleBlock) {
  if (block.cardType === "routine") {
    if (block.category === "Saúde") return "TREINO";
    if (block.category === "Alimentação") return "REFEIÇÃO";
    return "ROTINA";
  }
  return block.category === "Tempo livre" ? "NOTAS DE ALÍVIO" : "CHECKLIST";
}

function getActivityHeading(block: ScheduleBlock) {
  const area = block.scope?.area;
  const front = block.scope?.front;
  const project = block.scope?.project;

  if (area && front && project) {
    return {
      overline: `${area} | ${front}`,
      title: project,
    };
  }

  if (area && front) {
    return {
      overline: area,
      title: front,
    };
  }

  return {
    overline: undefined,
    title: block.title,
  };
}

function buildSlideContext(
  baseContext: CurrentActivity,
  block: ScheduleBlock,
  nowMinutes: number,
): CurrentActivity {
  const start = toMinutesFromClock(block.startTime);
  const end = toMinutesFromClock(block.endTime);
  const progress =
    end > start ? Math.min(100, Math.max(0, ((nowMinutes - start) / (end - start)) * 100)) : 0;

  return {
    ...baseContext,
    current: block,
    start,
    end,
    progress,
    remaining: Math.max(0, end - nowMinutes),
  };
}

function getViewModeForSlide(
  slide: ScheduleBlock,
  current: ScheduleBlock | null,
  nowMinutes: number,
): "current" | "past" | "future" {
  if (slide.id === current?.id || (slide.category === "Tempo livre" && !current)) return "current";
  return toMinutesFromClock(slide.endTime) <= nowMinutes ? "past" : "future";
}

function findProjectForSlide(projects: Project[], slide: ScheduleBlock | null) {
  return slide?.projectId ? projects.find((project) => project.id === slide.projectId) : undefined;
}

function selectActivityIndicators(indicators: ActivityIndicator[], selectedId: string) {
  return indicators.map((indicator) => ({
    ...indicator,
    selected: indicator.id === selectedId,
  }));
}

function toMinutesFromClock(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function useFitText(
  ref: RefObject<HTMLElement | null>,
  text: string,
  maxFontSize: number,
  minFontSize: number,
) {
  const [fontSize, setFontSize] = useState(maxFontSize);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const fit = () => {
      let nextSize = maxFontSize;
      element.style.fontSize = `${nextSize}px`;

      while (element.scrollWidth > element.clientWidth && nextSize > minFontSize) {
        nextSize -= 1;
        element.style.fontSize = `${nextSize}px`;
      }

      setFontSize(nextSize);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, text, maxFontSize, minFontSize]);

  return `${fontSize}px`;
}

export interface ActivityChecklistItem {
  id: string;
  title: string;
  priority?: boolean;
  context?: string;
  source?: "checklist" | "task" | "project-action" | "notice";
  taskId?: string;
  projectId?: string;
  configureBlock?: ScheduleBlock;
  done?: boolean;
}

interface ActivityIndicator {
  id: string;
  kind: "activity" | "free";
  selected: boolean;
  inProgress: boolean;
}

function ActivityPositionDots({ indicators }: { indicators: ActivityIndicator[] }) {
  return (
    <div className="mt-3 flex h-3 shrink-0 items-center justify-center gap-1.5">
      {indicators.map((indicator) => (
        <span
          key={indicator.id}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            indicator.inProgress ? "w-5" : "w-2",
            indicator.kind === "free"
              ? indicator.selected
                ? "border border-primary bg-transparent"
                : "border border-muted-foreground/35 bg-transparent"
              : indicator.selected
                ? "bg-primary"
                : "bg-muted-foreground/25",
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function getActivityChecklist(current: NonNullable<CurrentActivity["current"]>) {
  const seeds =
    current.activityChecklist && current.activityChecklist.length > 0
      ? current.activityChecklist
      : current.nextAction
        ? [current.nextAction]
        : [];

  return seeds.map((seed, index) => ({
    id: `${current.id}:checklist:${index}`,
    title: typeof seed === "string" ? seed : seed.title,
    priority: typeof seed === "string" ? false : seed.priority,
  }));
}

function orderChecklistItems(
  items: ActivityChecklistItem[],
  checklistItemDone: (id: string) => boolean,
) {
  return [...items].sort((a, b) => {
    const aDone = checklistItemDone(a.id);
    const bDone = checklistItemDone(b.id);
    if (aDone !== bDone) return aDone ? 1 : -1;
    if (aDone && bDone) return 0;
    return Number(Boolean(b.priority)) - Number(Boolean(a.priority));
  });
}

function getVisibleChecklistItems(
  items: ActivityChecklistItem[],
  checklistItemDone: (id: string) => boolean,
  checklistItemCompletedAt?: (id: string) => string | undefined,
  todayKey?: string,
) {
  return items.filter((item) => {
    if (item.source === "task" || item.source === "project-action") return true;
    if (!checklistItemDone(item.id)) return true;
    const completedAt = checklistItemCompletedAt?.(item.id);
    if (!completedAt) return true;

    return toDateKey(new Date(completedAt)) === todayKey;
  });
}

function isOperationalItemDone(
  item: ActivityChecklistItem,
  checklistItemDone: (id: string) => boolean,
) {
  if (item.source === "task" || item.source === "project-action") return Boolean(item.done);
  return checklistItemDone(item.id);
}

function buildScopedTaskChecklist(
  block: ScheduleBlock,
  focusedProject: Project | undefined,
  tasks: Task[],
  projects: Project[],
  fronts: ManagedFront[],
  todayKey: string,
): ActivityChecklistItem[] {
  if (block.cardType === "routine" || block.category === "Tempo livre") return [];

  const scope = resolveBlockTaskScope(block, focusedProject, projects, fronts);
  if (!scope) return [buildMissingScopeChecklistItem(block)];

  const directTasks = tasks
    .filter((task) => taskMatchesScope(task.fatherId, scope))
    .filter((task) => taskIsVisibleInOperationalCard(task, todayKey))
    .map((task) => ({
      id: `task:${task.id}`,
      taskId: task.id,
      title: task.title,
      priority: task.quick,
      context: formatTaskPath(task.fatherId, fronts, projects),
      source: "task" as const,
      done: Boolean(task.dueDate),
    }));

  const projectActions = projects
    .filter((project) => projectMatchesScope(project, scope))
    .flatMap((project) =>
      project.actions
        .filter((action) => taskIsVisibleInOperationalCard(action, todayKey))
        .map((action) => ({
          id: `project-action:${project.id}:${action.id}`,
          taskId: action.id,
          projectId: project.id,
          title: action.title,
          priority: action.quick,
          context: `${project.category} · ${project.frontTitle} · ${project.title}`,
          source: "project-action" as const,
          done: Boolean(action.dueDate),
        })),
    );

  return [...directTasks, ...projectActions];
}

interface TaskScope {
  area: string;
  frontId?: string;
  projectId?: string;
}

function resolveBlockTaskScope(
  block: ScheduleBlock,
  focusedProject: Project | undefined,
  projects: Project[],
  fronts: ManagedFront[],
): TaskScope | null {
  const area = toFatherSegment(block.scope?.area ?? block.category);
  const requestedFront = block.scope?.front;
  const requestedProject = block.scope?.project;

  if (focusedProject) {
    return {
      area: toFatherSegment(focusedProject.category),
      frontId: focusedProject.frontId,
      projectId: focusedProject.id,
    };
  }

  if (requestedProject) {
    const requestedFrontLabel = requestedFront ? normalizeLabel(requestedFront) : null;
    const matchingProject = projects.find((project) => {
      if (toFatherSegment(project.category) !== area) return false;
      if (normalizeLabel(project.title) !== normalizeLabel(requestedProject)) return false;
      if (!requestedFrontLabel) return true;

      const front = fronts.find((item) => item.id === project.frontId);
      return normalizeLabel(front?.title ?? project.frontTitle) === requestedFrontLabel;
    });

    if (!matchingProject) return null;

    return {
      area: toFatherSegment(matchingProject.category),
      frontId: matchingProject.frontId,
      projectId: matchingProject.id,
    };
  }

  if (requestedFront) {
    const matchingFront = fronts.find(
      (front) =>
        toFatherSegment(front.area) === area &&
        normalizeLabel(front.title) === normalizeLabel(requestedFront),
    );

    if (!matchingFront) return null;

    return {
      area,
      frontId: matchingFront.id,
    };
  }

  const labelCandidates = [block.subtitle, block.title].filter(Boolean).map((label) => normalizeLabel(label));
  const matchingProject = projects.find(
    (project) =>
      toFatherSegment(project.category) === area &&
      labelCandidates.some((label) => label === normalizeLabel(project.title)),
  );
  if (matchingProject) {
    return {
      area: toFatherSegment(matchingProject.category),
      frontId: matchingProject.frontId,
      projectId: matchingProject.id,
    };
  }

  const matchingFront = fronts.find(
    (front) =>
      toFatherSegment(front.area) === area &&
      labelCandidates.some((label) => label === normalizeLabel(front.title)),
  );

  return {
    area,
    frontId: matchingFront?.id,
  };
}

function buildMissingScopeChecklistItem(block: ScheduleBlock): ActivityChecklistItem {
  const missingLabel = block.scope?.project
    ? `projeto "${block.scope.project}"`
    : block.scope?.front
      ? `frente "${block.scope.front}"`
      : "escopo";
  const path = [block.scope?.area ?? block.category, block.scope?.front, block.scope?.project]
    .filter(Boolean)
    .join(" · ");

  return {
    id: `${block.id}:missing-scope`,
    title: `Configurar ${missingLabel} para listar as tarefas certas.`,
    context: path || undefined,
    source: "notice",
    configureBlock: block,
  };
}

function taskMatchesScope(fatherId: string, scope: TaskScope) {
  const father = parseFatherId(fatherId);
  if (father.area !== scope.area) return false;
  if (scope.projectId) return father.projectId === scope.projectId;
  if (scope.frontId) return father.frontId === scope.frontId;
  return true;
}

function projectMatchesScope(project: Project, scope: TaskScope) {
  if (toFatherSegment(project.category) !== scope.area) return false;
  if (scope.projectId) return project.id === scope.projectId;
  if (scope.frontId) return project.frontId === scope.frontId;
  return true;
}

function taskIsVisibleInOperationalCard(
  task: Pick<Task | ProjectAction, "visibleFrom" | "dueDate">,
  todayKey: string,
) {
  const visibleByStart = !task.visibleFrom || task.visibleFrom <= todayKey;
  const visibleByCompletion = !task.dueDate || task.dueDate === todayKey;
  return visibleByStart && visibleByCompletion;
}

function formatTaskPath(fatherId: string, fronts: ManagedFront[], projects: Project[]) {
  const father = parseFatherId(fatherId);
  const front = father.frontId ? fronts.find((item) => item.id === father.frontId) : undefined;
  const project = father.projectId ? projects.find((item) => item.id === father.projectId) : undefined;

  return [
    formatFatherSegment(father.area),
    front?.title ?? formatFatherSegment(father.frontId),
    project?.title ?? formatFatherSegment(father.projectId),
  ]
    .filter(Boolean)
    .join(" · ");
}

function parseFatherId(fatherId: string) {
  const [area, frontId, projectId] = fatherId.split(".");
  return { area, frontId, projectId };
}

function normalizeLabel(value?: string) {
  return toFatherSegment(value ?? "");
}

function toFatherSegment(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatFatherSegment(segment?: string) {
  if (!segment) return "";
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDeadlineDistance(deadline: string) {
  const parsed = parseShortPortugueseDate(deadline);
  if (!parsed) return "A definir";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffInDays = Math.ceil((parsed.getTime() - today.getTime()) / 86_400_000);

  if (diffInDays < 0) return `Atrasada há ${Math.abs(diffInDays)} dias`;
  if (diffInDays === 0) return "Entrega hoje";
  if (diffInDays === 1) return "Falta 1 dia";
  return `Faltam ${diffInDays} dias`;
}

function parseShortPortugueseDate(value: string) {
  const match = value
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})\s+([a-zç.]+)$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = SHORT_MONTHS[match[2].replace(".", "")];
  if (!day || month === undefined) return null;

  const today = new Date();
  const parsed = new Date(today.getFullYear(), month, day);
  parsed.setHours(0, 0, 0, 0);

  return parsed;
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
