import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
  type PointerEvent,
} from "react";
import { Check, ChevronDown, Flag, Plus } from "lucide-react";

import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";
import type { CurrentActivity } from "@/lib/schedule";
import { formatDuration } from "@/lib/schedule";
import type { Project, ScheduleBlock } from "@/data/mockData";
import { cn } from "@/lib/utils";

type ActivitySlide = ScheduleBlock | "free";
const SLIDE_TRANSITION_MS = 420;

interface Props {
  context: CurrentActivity;
  project?: Project | undefined;
  done: boolean;
  checklistItemDone: (id: string) => boolean;
  extraChecklistItems: ActivityChecklistItem[];
  onToggleChecklistItem: (id: string) => void;
  onAddChecklistItem: (title: string, priority: boolean) => void;
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
  done,
  checklistItemDone,
  extraChecklistItems,
  onToggleChecklistItem,
  onAddChecklistItem,
  viewMode = "current",
  previousSlide = null,
  nextSlide = null,
  canNavigatePrevious = false,
  canNavigateNext = false,
  onNavigatePrevious,
  onNavigateNext,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftPriority, setDraftPriority] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isSettling, setIsSettling] = useState(false);
  const [edgeFeedback, setEdgeFeedback] = useState<"previous" | "next" | null>(null);
  const checklistScrollRef = useRef<HTMLDivElement>(null);
  const firstPendingRef = useRef<HTMLButtonElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontalDragRef = useRef(false);
  const edgeFeedbackTimeoutRef = useRef<number | null>(null);
  const slideTransitionTimeoutRef = useRef<number | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { current, next, progress, remaining } = context;
  const activityTitle = current ? (current.subtitle ?? current.title) : "";
  const titleFontSize = useFitText(titleRef, activityTitle, 28, 18);
  const checklist = current
    ? orderChecklistItems(
        [...getActivityChecklist(current), ...extraChecklistItems],
        checklistItemDone,
      )
    : [];
  const firstPendingId = checklist.find((item) => !checklistItemDone(item.id))?.id;

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
    },
    [],
  );

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
      if (isHorizontalDragRef.current && open) setOpen(false);
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
        if (shouldGoPrevious) onNavigatePrevious?.();
        if (shouldGoNext) onNavigateNext?.();
        setDragX(0);
        setIsSettling(false);
        slideTransitionTimeoutRef.current = null;
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
  const slideStyle = { "--drag-x": `${dragX}px`, "--slide-gap": "12px" } as CSSProperties;
  const isDragging = dragX !== 0 && !isSettling;

  if (!current) {
    return (
      <section
        className="rise relative h-[545px] touch-pan-y cursor-grab overflow-hidden active:cursor-grabbing"
        style={slideStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        {previousSlide ? (
          <SlidePreview
            slide={previousSlide}
            label="ANTERIOR"
            className={cn(
              "-translate-x-full",
              "translate-x-[calc(-100%-var(--slide-gap)+var(--drag-x))]",
              !isDragging && "transition-transform duration-[420ms] ease-out",
            )}
          />
        ) : null}
        {nextSlide ? (
          <SlidePreview
            slide={nextSlide}
            label="PRÓXIMA"
            className={cn(
              "translate-x-full",
              "translate-x-[calc(100%+var(--slide-gap)+var(--drag-x))]",
              !isDragging && "transition-transform duration-[420ms] ease-out",
            )}
          />
        ) : null}

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

        <article
          className={cn(
            "relative z-10 h-full overflow-hidden rounded-3xl border border-border/60 bg-card p-6",
            isDragging ? "transition-none" : "transition-transform duration-[420ms] ease-out",
          )}
          style={{ transform: "translateX(var(--drag-x))" }}
        >
          <p className="shrink-0 whitespace-nowrap text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
            TEMPO LIVRE
          </p>
          <h2 className="mt-3 overflow-hidden whitespace-nowrap text-2xl font-semibold tracking-tight">
            Nenhuma atividade planejada
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {next
              ? `Nenhum compromisso até ${next.startTime}. Aproveite sem precisar otimizar este período.`
              : "Nada mais planejado para hoje."}
          </p>
          {next ? (
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-elevated/60 px-4 py-3">
              <span className="tabular shrink-0 whitespace-nowrap text-sm font-medium text-primary">
                {next.startTime}
              </span>
              <span className="min-w-0 truncate whitespace-nowrap text-sm text-muted-foreground">
                {next.title}
              </span>
            </div>
          ) : null}
        </article>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "rise relative touch-pan-y cursor-grab overflow-hidden transition-[height] duration-300 ease-out active:cursor-grabbing",
        open ? "h-[660px]" : "h-[545px]",
      )}
      style={slideStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      {previousSlide ? (
        <SlidePreview
          slide={previousSlide}
          label="ANTERIOR"
          className={cn(
            "-translate-x-full",
            "translate-x-[calc(-100%-var(--slide-gap)+var(--drag-x))]",
            !isDragging && "transition-transform duration-[420ms] ease-out",
          )}
        />
      ) : null}
      {nextSlide ? (
        <SlidePreview
          slide={nextSlide}
          label="PRÓXIMA"
          className={cn(
            "translate-x-full",
            "translate-x-[calc(100%+var(--slide-gap)+var(--drag-x))]",
            !isDragging && "transition-transform duration-[420ms] ease-out",
          )}
        />
      ) : null}

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
          "relative z-10 h-full overflow-hidden rounded-3xl border border-primary/25 bg-card p-6",
          isDragging ? "transition-none" : "transition-transform duration-[420ms] ease-out",
        )}
        style={{ transform: "translateX(var(--drag-x))" }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="shrink-0 whitespace-nowrap text-[11px] font-medium tracking-[0.18em] text-primary">
            {viewLabel}
          </p>
          <StatusBadge tone={done ? "done" : "active"}>
            <span
              className={cn(
                "size-1.5 rounded-full bg-current",
                viewMode === "current" && !done && "live-dot",
              )}
            />
            {statusLabel}
          </StatusBadge>
        </div>

        <p className="mt-4 truncate whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {current.category}
        </p>
        <h2
          ref={titleRef}
          className="mt-1.5 overflow-hidden whitespace-nowrap font-semibold leading-tight tracking-tight"
          style={{ fontSize: titleFontSize }}
        >
          {activityTitle}
        </h2>

        <div className="tabular mt-5 flex items-baseline justify-between text-sm">
          <span className="shrink-0 whitespace-nowrap text-muted-foreground">
            {current.startTime} — {current.endTime}
          </span>
          <span className="min-w-0 truncate whitespace-nowrap pl-3 text-right text-xs text-muted-foreground">
            {timeInfo}
          </span>
        </div>
        <ProgressBar value={progress} className="mt-1.5" size="md" />

        <div className="mt-5 rounded-2xl bg-elevated/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
              CHECKLIST
            </p>
            <span className="tabular text-xs font-medium text-muted-foreground">
              {checklist.filter((item) => checklistItemDone(item.id)).length}/{checklist.length}
            </span>
          </div>
          <div
            ref={checklistScrollRef}
            className="app-scrollbar relative mt-3 h-[156px] space-y-2 overflow-y-auto pr-1"
          >
            {checklist.length > 0 ? (
              checklist.map((item) => {
                const itemDone = checklistItemDone(item.id);
                return (
                  <button
                    key={item.id}
                    ref={item.id === firstPendingId ? firstPendingRef : undefined}
                    type="button"
                    onClick={() => onToggleChecklistItem(item.id)}
                    className="press relative flex w-full items-start gap-3 rounded-2xl bg-card/70 px-3.5 py-3 text-left"
                  >
                    {item.priority && !itemDone ? (
                      <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
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
          <form
            className="mt-2 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.trim()) return;
              onAddChecklistItem(draft.trim(), draftPriority);
              setDraft("");
              setDraftPriority(false);
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Adicionar item"
              className="h-11 min-w-0 flex-1 rounded-2xl bg-card/70 px-3.5 text-[13px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setDraftPriority((value) => !value)}
              className={cn(
                "press grid size-11 shrink-0 place-items-center rounded-2xl border",
                draftPriority
                  ? "border-primary text-primary"
                  : "border-border text-muted-foreground",
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
        </div>

        {project || current.description || current.expectedResult ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="press mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-sm text-muted-foreground"
          >
            {open ? "Ocultar detalhes" : "Ver detalhes"}
            <ChevronDown
              className={cn("size-4 transition-transform duration-300", open && "rotate-180")}
            />
          </button>
        ) : null}

        {open ? (
          <div className="-mx-6 mt-2 space-y-4 border-t border-border/60 bg-elevated/30 px-6 py-5 text-sm">
            {current.description ? <Detail label="Atividade" value={current.description} /> : null}
            {project ? (
              <>
                <Detail label="Projeto" value={`${project.title} · ${project.progress}%`} />
                <Detail label="Objetivo relacionado" value={project.objective} />
              </>
            ) : null}
            {current.expectedResult ? (
              <Detail label="Resultado esperado" value={current.expectedResult} />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function isInteractiveElement(target: EventTarget | null) {
  return (
    target instanceof HTMLElement && Boolean(target.closest("button, input, textarea, select, a"))
  );
}

function SlidePreview({
  slide,
  label,
  className,
}: {
  slide: ActivitySlide;
  label: string;
  className: string;
}) {
  const title = slide === "free" ? "Nenhuma atividade planejada" : (slide.subtitle ?? slide.title);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleFontSize = useFitText(titleRef, title, 28, 18);

  if (slide === "free") {
    return (
      <article
        className={cn(
          "pointer-events-none absolute inset-0 h-full overflow-hidden rounded-3xl border border-border/60 bg-card p-6",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="shrink-0 whitespace-nowrap text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
            TEMPO LIVRE
          </p>
          <StatusBadge tone="active">Arraste</StatusBadge>
        </div>
        <h2
          ref={titleRef}
          className="mt-3 overflow-hidden whitespace-nowrap font-semibold leading-tight tracking-tight"
          style={{ fontSize: titleFontSize }}
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Solte para voltar ao tempo livre.
        </p>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "pointer-events-none absolute inset-0 h-full overflow-hidden rounded-3xl border border-primary/25 bg-card p-6",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="shrink-0 whitespace-nowrap text-[11px] font-medium tracking-[0.18em] text-primary">
          {label}
        </p>
        <StatusBadge tone="active">Arraste</StatusBadge>
      </div>
      <p className="mt-4 truncate whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {slide.category}
      </p>
      <h2
        ref={titleRef}
        className="mt-1.5 overflow-hidden whitespace-nowrap font-semibold leading-tight tracking-tight"
        style={{ fontSize: titleFontSize }}
      >
        {title}
      </h2>
      <p className="tabular mt-5 whitespace-nowrap text-sm text-muted-foreground">
        {slide.startTime} — {slide.endTime}
      </p>
      <div className="mt-5 rounded-2xl bg-elevated/60 p-4">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">CHECKLIST</p>
        <p className="mt-3 text-sm leading-snug text-muted-foreground">
          Solte para editar esta atividade.
        </p>
      </div>
    </article>
  );
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

interface ActivityChecklistItem {
  id: string;
  title: string;
  priority?: boolean;
}

function getActivityChecklist(current: NonNullable<CurrentActivity["current"]>) {
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
    if (aDone !== bDone) return aDone ? -1 : 1;
    if (aDone && bDone) return 0;
    return Number(Boolean(b.priority)) - Number(Boolean(a.priority));
  });
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
        {label.toUpperCase()}
      </p>
      <p className="mt-1 leading-snug">{value}</p>
    </div>
  );
}
