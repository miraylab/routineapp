import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { Check, ChevronDown, Flag, Plus } from "lucide-react";

import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";
import type { CurrentActivity } from "@/lib/schedule";
import { formatDuration } from "@/lib/schedule";
import type { Project } from "@/data/mockData";
import { cn } from "@/lib/utils";

interface Props {
  context: CurrentActivity;
  project?: Project | undefined;
  done: boolean;
  checklistItemDone: (id: string) => boolean;
  extraChecklistItems: ActivityChecklistItem[];
  onToggleChecklistItem: (id: string) => void;
  onAddChecklistItem: (title: string, priority: boolean) => void;
  viewMode?: "current" | "past" | "future";
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
  canNavigatePrevious = false,
  canNavigateNext = false,
  onNavigatePrevious,
  onNavigateNext,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftPriority, setDraftPriority] = useState(false);
  const [dragX, setDragX] = useState(0);
  const checklistScrollRef = useRef<HTMLDivElement>(null);
  const firstPendingRef = useRef<HTMLButtonElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontalDragRef = useRef(false);
  const { current, next, progress, remaining } = context;
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

  if (!current) {
    return (
      <section className="rise rounded-3xl border border-border/60 bg-card p-6">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
          TEMPO LIVRE
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">Nenhuma atividade planejada</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {next
            ? `Nenhum compromisso até ${next.startTime}. Aproveite sem precisar otimizar este período.`
            : "Nada mais planejado para hoje."}
        </p>
        {next ? (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-elevated/60 px-4 py-3">
            <span className="tabular text-sm font-medium text-primary">{next.startTime}</span>
            <span className="text-sm text-muted-foreground">{next.title}</span>
          </div>
        ) : null}
      </section>
    );
  }

  const activityTitle = current.subtitle ?? current.title;
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
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    isHorizontalDragRef.current = false;
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
    const blocked = (deltaX > 0 && !canNavigatePrevious) || (deltaX < 0 && !canNavigateNext);
    setDragX(blocked ? deltaX * 0.18 : deltaX * 0.35);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLElement>) => {
    const start = dragStartRef.current;
    if (!start) return;

    const deltaX = event.clientX - start.x;
    const shouldNavigate = Math.abs(deltaX) > 64 && isHorizontalDragRef.current;

    if (shouldNavigate && deltaX > 0 && canNavigatePrevious) onNavigatePrevious?.();
    if (shouldNavigate && deltaX < 0 && canNavigateNext) onNavigateNext?.();

    dragStartRef.current = null;
    isHorizontalDragRef.current = false;
    setDragX(0);
  };

  return (
    <section
      className="rise touch-pan-y overflow-hidden rounded-3xl border border-primary/25 bg-card transition-transform duration-200 ease-out"
      style={{ transform: `translateX(${dragX}px)` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div className="p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium tracking-[0.18em] text-primary">{viewLabel}</p>
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

        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {current.category}
        </p>
        <h2 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-tight">
          {activityTitle}
        </h2>

        <div className="tabular mt-5 flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">
            {current.startTime} — {current.endTime}
          </span>
          <span className="text-xs text-muted-foreground">{timeInfo}</span>
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
          {checklist.length > 0 ? (
            <div
              ref={checklistScrollRef}
              className="app-scrollbar relative mt-3 max-h-[156px] space-y-2 overflow-y-auto pr-1"
            >
              {checklist.map((item) => {
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
              })}
            </div>
          ) : null}
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
      </div>

      {open ? (
        <div className="rise space-y-4 border-t border-border/60 bg-elevated/30 px-6 py-5 text-sm">
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
    </section>
  );
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
