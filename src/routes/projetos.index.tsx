import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Flag, Plus, User, X } from "lucide-react";

import { StatusBadge } from "@/components/yuri/StatusBadge";
import type { Category, Project, ProjectStatus, ScheduleBlock, Task } from "@/data/mockData";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore, type ManagedFront } from "@/lib/store";
import {
  findProjectEffectiveDeadlineKey,
  findProjectEffectiveDeadlineSortKey,
  findProjectAgendaOccurrence,
  formatAgendaOccurrenceDistance,
  projectUsesHourlyAgendaLabel,
} from "@/lib/projectAgendaDeadline";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projetos/")({
  head: () => ({
    meta: [
      { title: "Projetos · YURI OS" },
      {
        name: "description",
        content:
          "Projetos ativos com objetivo, progresso, próximo marco, próxima ação e prazo.",
      },
      { property: "og:title", content: "Projetos · YURI OS" },
      {
        property: "og:description",
        content: "Projetos ativos com progresso, próximo marco e próxima ação.",
      },
    ],
  }),
  component: ProjetosPage,
});

const PROJECTS_SELECTED_AREA_STORAGE_KEY = "routineapp:projects:selected-area";

function ProjetosPage() {
  const {
    projects,
    tasks,
    fronts,
    scheduleBlocks,
    projectsLoading,
    nowMinutes,
    toggleTask,
    todayKey,
    addFront,
    addProject,
    addTask,
    projectAreaCovers,
    updateProjectAreaCover,
  } = useStore();
  const hierarchy = useMemo(
    () => buildProjectHierarchy(projects, tasks, fronts, scheduleBlocks, todayKey, nowMinutes),
    [fronts, nowMinutes, projects, scheduleBlocks, tasks, todayKey],
  );
  const [selectedArea, setSelectedArea] = useState<Category>(
    () => getProjectsFocusFromUrl().area ?? getSavedProjectsArea() ?? "Michelin",
  );
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeHandledRef = useRef(false);
  const [addFrontOpen, setAddFrontOpen] = useState(false);
  const [frontTitle, setFrontTitle] = useState("");
  const [frontObjective, setFrontObjective] = useState("");
  const [frontError, setFrontError] = useState("");
  const [showCompletedProjects, setShowCompletedProjects] = useState(false);
  const [coverUploadingArea, setCoverUploadingArea] = useState<Category | null>(null);

  const currentArea = hierarchy.find((area) => area.area === selectedArea) ?? hierarchy[0];
  const activeArea = useMemo(
    () => (currentArea ? filterActiveProjectArea(currentArea) : undefined),
    [currentArea],
  );
  const completedArea = useMemo(
    () => (currentArea ? filterCompletedProjectArea(currentArea) : undefined),
    [currentArea],
  );
  const hasHiddenCompletedProjects = currentArea ? hasCompletedProjectContent(currentArea) : false;
  const focusedFrontId = getProjectsFocusFromUrl().frontId;

  const moveArea = useCallback(
    (direction: 1 | -1) => {
      const currentIndex = hierarchy.findIndex((area) => area.area === selectedArea);
      const nextArea = hierarchy[currentIndex + direction];
      if (!nextArea) return;
      setSelectedArea(nextArea.area);
    },
    [hierarchy, selectedArea],
  );

  const handleSwipeEnd = useCallback(
    (x: number, y: number) => {
      const start = swipeStartRef.current;
      swipeStartRef.current = null;
      if (!start) return;

      const deltaX = x - start.x;
      const deltaY = y - start.y;
      const isHorizontalSwipe = Math.abs(deltaX) > 56 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35;
      if (!isHorizontalSwipe) return;

      swipeHandledRef.current = true;
      moveArea(deltaX < 0 ? 1 : -1);
    },
    [moveArea],
  );

  useEffect(() => {
    const focus = getProjectsFocusFromUrl();
    if (!focus.area) return;
    setSelectedArea(focus.area);
  }, []);

  useEffect(() => {
    saveProjectsArea(selectedArea);
  }, [selectedArea]);

  useEffect(() => {
    setShowCompletedProjects(false);
  }, [selectedArea]);

  useEffect(() => {
    if (!focusedFrontId || !activeArea?.fronts.some((front) => front.id === focusedFrontId)) return;

    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(frontElementId(focusedFrontId))
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeArea?.fronts, focusedFrontId]);

  return (
    <div className="space-y-3">
      {currentArea ? (
        <ProjectOverview
          area={currentArea}
          coverImageUrl={projectAreaCovers[currentArea.area]}
          uploading={coverUploadingArea === currentArea.area}
          onCoverSelected={async (file) => {
            setCoverUploadingArea(currentArea.area);
            try {
              await updateProjectAreaCover(currentArea.area, file);
            } finally {
              setCoverUploadingArea(null);
            }
          }}
        />
      ) : null}

      <div className="grid grid-cols-[1fr_1fr_1fr_44px] gap-2">
        {hierarchy.map((area) => (
          <button
            key={area.area}
            type="button"
            onClick={() => setSelectedArea(area.area)}
            className={cn(
              "press h-11 min-w-0 rounded-2xl text-sm font-medium transition-colors",
              area.area === selectedArea
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground",
            )}
            aria-label={area.area}
          >
            {area.area === "Pessoal" ? <User className="mx-auto size-4" /> : area.area}
          </button>
        ))}
      </div>

      {currentArea ? (
        <div
          className="space-y-3 touch-pan-y"
          onClickCapture={(event) => {
            if (!swipeHandledRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            window.setTimeout(() => {
              swipeHandledRef.current = false;
            }, 0);
          }}
          onPointerDown={(event) => {
            if (
              (event.target as HTMLElement).closest(
                "button,a,input,textarea,select,[data-front-card-control],[data-projects-block]",
              )
            ) {
              return;
            }
            swipeStartRef.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => handleSwipeEnd(event.clientX, event.clientY)}
          onPointerCancel={() => {
            swipeStartRef.current = null;
          }}
        >
          {projectsLoading && !activeArea?.fronts.length ? (
            <ProjectsLoadingSkeleton />
          ) : activeArea?.fronts.length ? (
            activeArea.fronts.map((front) => (
              <FrontSection
                key={front.id}
                front={front}
                todayKey={todayKey}
                nowMinutes={nowMinutes}
                scheduleBlocks={scheduleBlocks}
                onToggleTask={toggleTask}
                onAddTask={addTask}
                onAddProject={addProject}
              />
            ))
          ) : (
            <section className="rounded-3xl border border-border/60 bg-card p-5">
              <p className="text-sm leading-snug text-muted-foreground">
                Nenhuma frente carregada para esta área.
              </p>
            </section>
          )}
          {hasHiddenCompletedProjects ? (
            <button
              type="button"
              onClick={() => setShowCompletedProjects((value) => !value)}
              className="press flex h-11 w-full items-center justify-center rounded-2xl bg-card px-4 text-sm font-medium text-muted-foreground"
            >
              {showCompletedProjects ? "Ocultar Projetos Concluídos" : "Ver Projetos Concluídos"}
            </button>
          ) : null}
          {showCompletedProjects && completedArea?.fronts.length ? (
            <div className="space-y-3">
              {completedArea.fronts.map((front) => (
                <FrontSection
                  key={`completed-${front.id}`}
                  front={front}
                  todayKey={todayKey}
                  nowMinutes={nowMinutes}
                  scheduleBlocks={scheduleBlocks}
                  onToggleTask={toggleTask}
                  onAddTask={addTask}
                  onAddProject={addProject}
                  showStatus
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <Dialog open={addFrontOpen} onOpenChange={setAddFrontOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[430px] rounded-3xl border-border/60 bg-card p-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base">Adicionar frente</DialogTitle>
            <DialogDescription>
              Nova frente dentro de {currentArea?.area ?? selectedArea}.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!currentArea || !frontTitle.trim()) return;
              const duplicated = currentArea.fronts.some(
                (front) => toFatherSegment(front.title) === toFatherSegment(frontTitle),
              );
              if (duplicated) {
                setFrontError("Essa frente já existe nesta área.");
                return;
              }
              const created = addFront(currentArea.area, frontTitle, frontObjective);
              if (!created) {
                setFrontError("Não consegui criar essa frente. Confira se ela já existe.");
                return;
              }
              setFrontTitle("");
              setFrontObjective("");
              setFrontError("");
              setAddFrontOpen(false);
            }}
          >
            <input
              value={frontTitle}
              onChange={(event) => {
                setFrontTitle(event.target.value);
                setFrontError("");
              }}
              placeholder="Nome da frente"
              className="h-12 w-full rounded-2xl bg-elevated/50 px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            <textarea
              value={frontObjective}
              onChange={(event) => setFrontObjective(event.target.value)}
              placeholder="Objetivo"
              className="app-scrollbar h-28 w-full resize-none rounded-2xl bg-elevated/50 px-4 py-3 text-[15px] leading-snug outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            {frontError ? (
              <p className="text-xs leading-snug text-destructive">{frontError}</p>
            ) : null}
            <button
              type="submit"
              disabled={!frontTitle.trim()}
              className="press flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-elevated/70 px-4 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:text-muted-foreground"
            >
              <Plus className="size-4" />
              Adicionar Frente
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectsLoadingSkeleton() {
  return (
    <div className="space-y-3" aria-label="Carregando projetos">
      {[0, 1, 2].map((item) => (
        <section
          key={item}
          className="overflow-hidden rounded-3xl border border-border/60 bg-card p-5"
        >
          <div className="animate-pulse space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="h-5 w-36 rounded-full bg-elevated/70" />
              <div className="flex gap-2">
                <div className="size-8 rounded-xl bg-elevated/70" />
                <div className="size-8 rounded-xl bg-elevated/70" />
              </div>
            </div>
            <div className="rounded-2xl bg-elevated/35 p-3">
              <div className="mb-3 h-3 w-20 rounded-full bg-elevated/70" />
              <div className="space-y-2">
                <div className="h-10 rounded-2xl bg-card/70" />
                <div className="h-10 rounded-2xl bg-card/55" />
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function ProjectOverview({
  area,
  coverImageUrl,
  uploading,
  onCoverSelected,
}: {
  area: ProjectArea;
  coverImageUrl?: string;
  uploading: boolean;
  onCoverSelected: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section
      className={cn(
        "relative min-h-32 overflow-hidden rounded-3xl shadow-[0_18px_40px_rgba(0,0,0,0.18)]",
        coverImageUrl ? "bg-card" : "bg-primary",
      )}
      aria-label={`Resumo visual de ${area.area}`}
    >
      {coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      ) : null}
      <div className="absolute inset-0 bg-black/0" />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          onCoverSelected(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="press absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-xl bg-background/15 text-primary-foreground backdrop-blur-sm disabled:cursor-wait disabled:opacity-70"
        aria-label={`Trocar imagem de ${area.area}`}
      >
        {uploading ? (
          <span className="size-3 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}
      </button>
    </section>
  );
}

function FrontSection({
  front,
  todayKey,
  nowMinutes,
  scheduleBlocks,
  onToggleTask,
  onAddTask,
  onAddProject,
  showStatus = false,
}: {
  front: ProjectFront;
  todayKey: string;
  nowMinutes: number;
  scheduleBlocks: ScheduleBlock[];
  onToggleTask: (id: string) => void;
  onAddTask: (
    title: string,
    fatherId?: string,
    options?: {
      quick?: boolean;
      visibleFrom?: string;
      recurrence?: NonNullable<Task["recurrence"]>;
    },
  ) => void;
  onAddProject: (input: {
    category: Category;
    frontId: string;
    frontTitle: string;
    title: string;
    objective?: string;
    deadline?: string;
  }) => boolean;
  showStatus?: boolean;
}) {
  const navigate = useNavigate();
  const [tasksDismissed, setTasksDismissed] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskQuick, setTaskQuick] = useState(false);
  const [taskVisibleFrom, setTaskVisibleFrom] = useState("");
  const [taskRecurrence, setTaskRecurrence] =
    useState<NonNullable<Task["recurrence"]>>("none");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectObjective, setProjectObjective] = useState("");
  const [projectDeadline, setProjectDeadline] = useState("");
  const [projectError, setProjectError] = useState("");
  const visibleDirectTasks = orderTasksByDoneLast(
    front.directTasks.filter((task) => taskIsVisibleInProjectManagement(task, todayKey)),
  );
  const openDirectTasks = visibleDirectTasks.filter((task) => !task.dueDate);
  const showTaskList = visibleDirectTasks.length > 0 && !(tasksDismissed && openDirectTasks.length === 0);
  const hasFrontContent = showTaskList || front.projects.length > 0;
  const fatherId = `${toFatherSegment(front.area)}.${front.id}`;
  const openFrontDetail = () => {
    navigate({ to: "/projetos/frentes/$frontId", params: { frontId: front.id } });
  };
  const openAddTask = (event?: Event) => {
    event?.preventDefault();
    event?.stopPropagation();
    setAddTaskOpen(true);
  };
  const openAddProject = (event?: Event) => {
    event?.preventDefault();
    event?.stopPropagation();
    setProjectError("");
    setAddProjectOpen(true);
  };

  return (
    <section
      id={frontElementId(front.id)}
      role="button"
      tabIndex={0}
      onClick={(event) => {
        if (
          (event.target as HTMLElement).closest(
            "[data-front-card-control],[data-projects-block],button,a,input,textarea",
          )
        ) {
          return;
        }
        openFrontDetail();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openFrontDetail();
        }
      }}
      className={cn(
        "press rounded-3xl border border-border/60 bg-card px-5 text-left",
        hasFrontContent ? "py-5" : "py-4",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2
              className={cn(
                "min-w-0 truncate font-semibold tracking-tight",
                hasFrontContent ? "text-xl" : "text-base",
              )}
            >
              {front.title}
            </h2>
            {showStatus && front.status !== "Em andamento" ? (
              <StatusBadge tone={front.status === "Concluído" ? "done" : "neutral"} className="shrink-0 px-2 py-0.5 text-[10px]">
                {front.status}
              </StatusBadge>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-front-card-control
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                className="press grid size-8 place-items-center rounded-xl bg-elevated/60 text-muted-foreground"
                aria-label={`Adicionar em ${front.title}`}
              >
                <Plus className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              data-front-card-control
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              className="w-48 rounded-2xl border-border/60 bg-card p-1.5 text-foreground"
            >
              <DropdownMenuItem
                data-front-card-control
                onClick={(event) => event.stopPropagation()}
                onSelect={openAddTask}
                className="rounded-xl px-3 py-2.5 text-sm"
              >
                Adicionar tarefa
              </DropdownMenuItem>
              <DropdownMenuItem
                data-front-card-control
                onClick={(event) => event.stopPropagation()}
                onSelect={openAddProject}
                className="rounded-xl px-3 py-2.5 text-sm"
              >
                Adicionar projeto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openFrontDetail();
            }}
            className="press grid size-8 place-items-center rounded-xl bg-elevated/60 text-muted-foreground"
            aria-label={`Abrir frente ${front.title}`}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {showTaskList ? (
        <div className="mt-4 rounded-2xl bg-elevated/45 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
              TAREFAS
            </p>
            <div className="flex items-center gap-2">
              {openDirectTasks.length === 0 && visibleDirectTasks.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setTasksDismissed(true)}
                  className="press grid size-7 shrink-0 place-items-center rounded-xl bg-card/70 text-muted-foreground"
                  aria-label="Fechar tarefas concluídas"
                >
                  <X className="size-3.5" />
                </button>
              ) : openDirectTasks.length > 0 ? (
                <p className="tabular text-xs text-muted-foreground">
                  {openDirectTasks.length} tasks
                </p>
              ) : null}
            </div>
          </div>

          <ul className="app-scrollbar mt-3 max-h-[190px] space-y-2 overflow-y-auto pr-1">
            {visibleDirectTasks.map((task) => {
              const taskDone = Boolean(task.dueDate);
              const visibleFromLabel = formatVisibleFromDistance(task.visibleFrom, todayKey);
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    className="press flex w-full items-start gap-3 rounded-2xl bg-card/70 px-3.5 py-3 text-left text-sm text-foreground"
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-200",
                        taskDone
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-transparent",
                      )}
                    >
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 leading-snug",
                        taskDone && "text-muted-foreground line-through",
                      )}
                    >
                      {task.title}
                    </span>
                    {visibleFromLabel || (task.quick && !taskDone) ? (
                      <span className="ml-auto flex shrink-0 items-center gap-2">
                        {visibleFromLabel ? (
                            <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[11px] font-medium leading-none text-primary">
                            {visibleFromLabel}
                          </span>
                        ) : null}
                        {task.quick && !taskDone ? (
                          <span className="size-2 rounded-full bg-primary" />
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {front.projects.length > 0 ? (
        <div
          data-projects-block
          className="mt-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
              PROJETOS
            </p>
          </div>
          <div className="app-scrollbar mt-2 max-h-[258px] space-y-2 overflow-y-auto pr-1">
            {front.projects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                todayKey={todayKey}
                nowMinutes={nowMinutes}
                scheduleBlocks={scheduleBlocks}
                showStatus={showStatus}
              />
            ))}
          </div>
        </div>
      ) : null}

      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent
          onClick={(event) => event.stopPropagation()}
          className="w-[calc(100vw-2rem)] max-w-[430px] rounded-3xl border-border/60 bg-card p-5"
        >
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base">Adicionar tarefa</DialogTitle>
            <DialogDescription>Nova tarefa em {front.title}.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!taskTitle.trim()) return;
              onAddTask(taskTitle, fatherId, {
                quick: taskQuick,
                visibleFrom: taskVisibleFrom || undefined,
                recurrence: taskRecurrence,
              });
              setTaskTitle("");
              setTaskQuick(false);
              setTaskVisibleFrom("");
              setTaskRecurrence("none");
              setAddTaskOpen(false);
              setTasksDismissed(false);
            }}
          >
            <input
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Nome da tarefa"
              className="h-12 w-full rounded-2xl bg-elevated/50 px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            <div className="grid grid-cols-[48px_1fr] gap-2">
              <button
                type="button"
                onClick={() => setTaskQuick((value) => !value)}
                className={cn(
                  "press grid size-12 shrink-0 place-items-center rounded-2xl border",
                  taskQuick ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                )}
                aria-label="Marcar como tarefa rápida"
                title="Menos de 5 minutos"
              >
                <Flag className="size-4" />
              </button>
              <input
                type="date"
                value={taskVisibleFrom}
                onChange={(event) => setTaskVisibleFrom(event.target.value)}
                className="h-12 min-w-0 rounded-2xl bg-elevated/50 px-3.5 text-[13px] text-foreground outline-none focus:ring-1 focus:ring-ring"
                aria-label="Data de aparição"
              />
            </div>
            <select
              value={taskRecurrence}
              onChange={(event) =>
                setTaskRecurrence(event.target.value as NonNullable<Task["recurrence"]>)
              }
              className="h-12 w-full min-w-0 rounded-2xl bg-elevated/50 px-3.5 text-[13px] text-foreground outline-none focus:ring-1 focus:ring-ring"
              aria-label="Recorrência"
            >
              <option value="none">Sem recorrência</option>
              <option value="daily">Diária</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
            <button
              type="submit"
              disabled={!taskTitle.trim()}
              className="press flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-elevated/70 px-4 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:text-muted-foreground"
            >
              <Plus className="size-4" />
              Adicionar tarefa
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addProjectOpen} onOpenChange={setAddProjectOpen}>
        <DialogContent
          onClick={(event) => event.stopPropagation()}
          className="w-[calc(100vw-2rem)] max-w-[430px] rounded-3xl border-border/60 bg-card p-5"
        >
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base">Adicionar projeto</DialogTitle>
            <DialogDescription>Novo projeto em {front.title}.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!projectTitle.trim()) return;
              const duplicated = front.projects.some(
                (project) => toFatherSegment(project.title) === toFatherSegment(projectTitle),
              );
              if (duplicated) {
                setProjectError("Esse projeto já existe nesta frente.");
                return;
              }
              const created = onAddProject({
                category: front.area,
                frontId: front.id,
                frontTitle: front.title,
                title: projectTitle,
                objective: projectObjective,
                deadline: projectDeadline || undefined,
              });
              if (!created) {
                setProjectError("Não consegui criar esse projeto. Confira se ele já existe.");
                return;
              }
              setProjectTitle("");
              setProjectObjective("");
              setProjectDeadline("");
              setProjectError("");
              setAddProjectOpen(false);
            }}
          >
            <input
              value={projectTitle}
              onChange={(event) => {
                setProjectTitle(event.target.value);
                setProjectError("");
              }}
              placeholder="Nome do projeto"
              className="h-12 w-full rounded-2xl bg-elevated/50 px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            <textarea
              value={projectObjective}
              onChange={(event) => setProjectObjective(event.target.value)}
              placeholder="Objetivo"
              className="app-scrollbar h-28 w-full resize-none rounded-2xl bg-elevated/50 px-4 py-3 text-[15px] leading-snug outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            <input
              type="date"
              value={projectDeadline}
              onChange={(event) => setProjectDeadline(event.target.value)}
              className="h-12 w-full rounded-2xl bg-elevated/50 px-3.5 text-[13px] text-foreground outline-none focus:ring-1 focus:ring-ring"
              aria-label="Deadline do projeto"
            />
            {projectError ? (
              <p className="text-xs leading-snug text-destructive">{projectError}</p>
            ) : null}
            <button
              type="submit"
              disabled={!projectTitle.trim()}
              className="press flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-elevated/70 px-4 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:text-muted-foreground"
            >
              <Plus className="size-4" />
              Adicionar projeto
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function getProjectsFocusFromUrl(): { area?: Category; frontId?: string } {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const area = params.get("area");
  const frontId = params.get("front") ?? undefined;

  return {
    area: isCategory(area) ? area : undefined,
    frontId,
  };
}

function getSavedProjectsArea(): Category | undefined {
  if (typeof window === "undefined") return undefined;
  const saved = window.localStorage.getItem(PROJECTS_SELECTED_AREA_STORAGE_KEY);
  return isCategory(saved) ? saved : undefined;
}

function saveProjectsArea(area: Category) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROJECTS_SELECTED_AREA_STORAGE_KEY, area);
}

function isCategory(value: string | null): value is Category {
  return value === "Michelin" || value === "Miray" || value === "Estudos" || value === "Pessoal";
}

function frontElementId(frontId: string) {
  return `front-card-${frontId}`;
}

function ProjectRow({
  project,
  todayKey,
  nowMinutes,
  scheduleBlocks,
  showStatus = false,
}: {
  project: Project;
  todayKey: string;
  nowMinutes: number;
  scheduleBlocks: ScheduleBlock[];
  showStatus?: boolean;
}) {
  const openActions = project.actions.filter(
    (action) => !action.dueDate,
  ).length;
  const agendaOccurrence = findProjectAgendaOccurrence(project, scheduleBlocks, todayKey, nowMinutes);
  const deadlineLabel = formatDeadlineDistance(project.deadline) ??
    (agendaOccurrence
      ? formatAgendaOccurrenceDistance(agendaOccurrence, todayKey, nowMinutes, {
          hourly: projectUsesHourlyAgendaLabel(project),
        })
      : null);

  return (
    <Link
      to="/projetos/$projectId"
      params={{ projectId: project.id }}
      className="press flex items-stretch gap-3 rounded-2xl border border-border/60 bg-elevated/45 px-3.5 py-3"
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
        <h4 className="min-w-0 break-words text-base font-semibold leading-snug">{project.title}</h4>
        {deadlineLabel || (showStatus && project.status !== "Em andamento") ? (
          <div className="mt-1.5 flex items-center">
            {deadlineLabel ? (
              <StatusBadge tone="active" className="px-2 py-0.5 text-[10px]">
                {deadlineLabel}
              </StatusBadge>
            ) : null}
            {showStatus && project.status !== "Em andamento" ? (
              <StatusBadge
                tone={project.status === "Concluído" ? "done" : "neutral"}
                className={cn(deadlineLabel && "ml-2", "px-2 py-0.5 text-[10px]")}
              >
                {project.status}
              </StatusBadge>
            ) : null}
          </div>
        ) : null}
      </div>
      <span
        className={cn(
          "tabular flex w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-card/65 py-2 text-center text-base font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
          openActions === 0 && "text-muted-foreground",
        )}
        aria-label={`${openActions} tarefas em aberto`}
        title={openActions === 0 ? "Nenhuma tarefa em aberto" : `${openActions} tarefas em aberto`}
      >
        <span className="leading-none">{openActions}</span>
        <span className="mt-0.5 text-[7px] font-medium uppercase leading-none tracking-[0.04em] text-muted-foreground">
          tasks
        </span>
      </span>
      <span className="sr-only">
        {openActions === 0 ? "Nenhuma tarefa em aberto" : `${openActions} tarefas em aberto`}
      </span>
    </Link>
  );
}

interface ProjectFront {
  id: string;
  area: Category;
  title: string;
  status: ProjectStatus;
  projects: Project[];
  directTasks: Task[];
  sortOrder?: number;
}

interface ProjectArea {
  area: Category;
  projects: Project[];
  fronts: ProjectFront[];
}

const AREA_ORDER: Category[] = ["Michelin", "Miray", "Estudos", "Pessoal"];
const PERSONAL_FRONT_ORDER = [
  "notas-de-alivio",
  "responsabilidades",
  "responsabiliades",
  "saude",
  "alimentacao",
];

function buildProjectHierarchy(
  projects: Project[],
  tasks: Task[],
  fronts: ManagedFront[],
  scheduleBlocks: ScheduleBlock[],
  todayKey: string,
  nowMinutes: number,
): ProjectArea[] {
  const areas = AREA_ORDER.map((area) => {
    const areaId = toFatherSegment(area);
    const activeFrontIds = new Set(fronts.filter((front) => front.area === area).map((front) => front.id));
    const areaProjects = projects.filter(
      (project) => project.category === area && activeFrontIds.has(project.frontId),
    );
    const directTasks = tasks.filter((task) => {
      const father = parseFatherId(task.fatherId);
      return (
        father.areaId === areaId &&
        !father.projectId &&
        (!father.frontId || activeFrontIds.has(father.frontId))
      );
    });
    const frontMap = new Map<string, ProjectFront>();

    areaProjects.forEach((project) => {
      const front = frontMap.get(project.frontId) ?? {
        id: project.frontId,
        area,
        title: project.frontTitle,
        status: "Em andamento",
        projects: [],
        directTasks: [],
        sortOrder: undefined,
      };
      front.projects.push(project);
      frontMap.set(project.frontId, front);
    });

    directTasks.forEach((task) => {
      const father = parseFatherId(task.fatherId);
      const frontId = father.frontId ?? `${areaId}-geral`;
      const front = frontMap.get(frontId) ?? {
        id: frontId,
        area,
        title: father.frontId ? formatFatherSegment(father.frontId) : "Geral",
        status: "Em andamento",
        projects: [],
        directTasks: [],
        sortOrder: undefined,
      };
      front.directTasks.push(task);
      frontMap.set(frontId, front);
    });

    fronts
      .filter((front) => front.area === area)
      .forEach((front) => {
        const existingFront = frontMap.get(front.id);
        if (existingFront) {
          frontMap.set(front.id, {
            ...existingFront,
            area: front.area,
            title: front.title,
            status: front.status,
            sortOrder: front.sortOrder,
          });
          return;
        }
        frontMap.set(front.id, {
          id: front.id,
          area: front.area,
          title: front.title,
          status: front.status,
          projects: [],
          directTasks: [],
          sortOrder: front.sortOrder,
        });
      });

    const orderedFronts = Array.from(frontMap.values())
      .map((front) => ({
        ...front,
        projects: [...front.projects].sort((a, b) =>
          compareProjectsByOperationalPriority(a, b, scheduleBlocks, todayKey, nowMinutes),
        ),
      }))
      .sort((a, b) =>
        area === "Pessoal"
          ? comparePersonalFronts(a, b, scheduleBlocks, todayKey, nowMinutes)
          : compareFrontsByOperationalPriority(a, b, scheduleBlocks, todayKey, nowMinutes),
      );

    return {
      area,
      projects: areaProjects,
      fronts: orderedFronts,
    };
  });

  return areas;
}

function comparePersonalFronts(
  a: ProjectFront,
  b: ProjectFront,
  scheduleBlocks: ScheduleBlock[],
  todayKey: string,
  nowMinutes: number,
) {
  const orderA = getPersonalFrontOrder(a.title);
  const orderB = getPersonalFrontOrder(b.title);
  if (orderA !== orderB) return orderA - orderB;
  if (orderA !== Number.MAX_SAFE_INTEGER) return compareFrontsByManualOrder(a, b);
  return compareFrontsByOperationalPriority(a, b, scheduleBlocks, todayKey, nowMinutes);
}

function getPersonalFrontOrder(title: string) {
  const index = PERSONAL_FRONT_ORDER.indexOf(toFatherSegment(title));
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

function filterActiveProjectArea(area: ProjectArea): ProjectArea {
  return {
    ...area,
    projects: area.projects.filter((project) => project.status === "Em andamento"),
    fronts: area.fronts
      .filter((front) => front.status === "Em andamento")
      .map((front) => ({
        ...front,
        projects: front.projects.filter((project) => project.status === "Em andamento"),
      })),
  };
}

function filterCompletedProjectArea(area: ProjectArea): ProjectArea {
  const hiddenFronts = area.fronts
    .filter((front) => front.status !== "Em andamento")
    .map((front) => ({
      ...front,
      projects: front.projects.filter((project) => project.status !== "Em andamento"),
    }));
  const frontsWithHiddenProjects = area.fronts
    .filter((front) => front.status === "Em andamento")
    .map((front) => ({
      ...front,
      projects: front.projects.filter((project) => project.status !== "Em andamento"),
      directTasks: [],
    }))
    .filter((front) => front.projects.length > 0);

  return {
    ...area,
    projects: area.projects.filter((project) => project.status !== "Em andamento"),
    fronts: [...hiddenFronts, ...frontsWithHiddenProjects].sort((a, b) =>
      compareFrontsByManualOrder(a, b),
    ),
  };
}

function hasCompletedProjectContent(area: ProjectArea) {
  return area.fronts.some(
    (front) =>
      front.status !== "Em andamento" ||
      front.projects.some((project) => project.status !== "Em andamento"),
  );
}

function compareFrontsByOperationalPriority(
  a: ProjectFront,
  b: ProjectFront,
  scheduleBlocks: ScheduleBlock[],
  todayKey: string,
  nowMinutes: number,
) {
  const priorityA = getFrontOperationalPriority(a, scheduleBlocks, todayKey, nowMinutes);
  const priorityB = getFrontOperationalPriority(b, scheduleBlocks, todayKey, nowMinutes);
  if (priorityA !== priorityB) return priorityA - priorityB;
  return compareFrontsByManualOrder(a, b);
}

function getFrontOperationalPriority(
  front: ProjectFront,
  scheduleBlocks: ScheduleBlock[],
  todayKey: string,
  nowMinutes: number,
) {
  const directTaskPriority = getTaskCollectionOperationalPriority(front.directTasks, todayKey);
  const projectPriority = front.projects.reduce(
    (priority, project) =>
      Math.min(priority, getProjectOperationalPriority(project, scheduleBlocks, todayKey, nowMinutes)),
    Number.MAX_SAFE_INTEGER,
  );

  return Math.min(directTaskPriority, projectPriority, 4);
}

function compareProjectsByOperationalPriority(
  a: Project,
  b: Project,
  scheduleBlocks: ScheduleBlock[],
  todayKey: string,
  nowMinutes: number,
) {
  const sortA = getProjectDeadlineSort(a, scheduleBlocks, todayKey, nowMinutes);
  const sortB = getProjectDeadlineSort(b, scheduleBlocks, todayKey, nowMinutes);
  if (sortA.group !== sortB.group) return sortA.group - sortB.group;
  if (sortA.deadlineKey && sortB.deadlineKey && sortA.deadlineKey !== sortB.deadlineKey) {
    return sortA.deadlineKey.localeCompare(sortB.deadlineKey);
  }
  return compareProjectsByManualOrder(a, b);
}

function getProjectDeadlineSort(
  project: Project,
  scheduleBlocks: ScheduleBlock[],
  todayKey: string,
  nowMinutes: number,
) {
  const deadlineKey = findProjectEffectiveDeadlineSortKey(project, scheduleBlocks, todayKey, nowMinutes);
  if (deadlineKey) return { group: 1, deadlineKey };
  if (projectHasOpenTask(project)) return { group: 0, deadlineKey: null };
  return { group: 2, deadlineKey: null };
}

function projectHasOpenTask(project: Project) {
  return project.actions.some((action) => !action.dueDate);
}

function getProjectOperationalPriority(
  project: Project,
  scheduleBlocks: ScheduleBlock[],
  todayKey: string,
  nowMinutes: number,
) {
  const taskPriority = getTaskCollectionOperationalPriority(project.actions, todayKey);
  const deadlinePriority = getDeadlineOperationalPriority(project, scheduleBlocks, todayKey, nowMinutes);
  return Math.min(taskPriority, deadlinePriority);
}

function getTaskCollectionOperationalPriority(
  tasks: Array<Pick<Task, "visibleFrom" | "dueDate">>,
  todayKey: string,
) {
  const openTasks = tasks.filter((task) => !task.dueDate);

  if (openTasks.some((task) => task.visibleFrom && task.visibleFrom < todayKey)) return 0;
  if (openTasks.some((task) => !task.visibleFrom || task.visibleFrom === todayKey)) return 1;
  if (openTasks.some((task) => task.visibleFrom && task.visibleFrom > todayKey)) return 2;
  return 4;
}

function getDeadlineOperationalPriority(
  project: Project,
  scheduleBlocks: ScheduleBlock[],
  todayKey: string,
  nowMinutes: number,
) {
  if (project.status !== "Em andamento") return 4;

  const deadline = parseShortPortugueseDate(project.deadline);
  const deadlineKey = deadline
    ? toDateKey(deadline)
    : findProjectEffectiveDeadlineKey(project, scheduleBlocks, todayKey, nowMinutes);
  if (!deadlineKey) return 3;

  if (deadlineKey < todayKey) return 0;
  if (deadlineKey === todayKey) return 1;
  return 2;
}

function compareFrontsByManualOrder(a: ProjectFront, b: ProjectFront) {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  const titleComparison = a.title.localeCompare(b.title);
  if (titleComparison !== 0) return titleComparison;
  return a.id.localeCompare(b.id);
}

function compareProjectsByManualOrder(a: Project, b: Project) {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  const titleComparison = a.title.localeCompare(b.title);
  if (titleComparison !== 0) return titleComparison;
  return a.id.localeCompare(b.id);
}

function parseFatherId(fatherId: string) {
  const [areaId, frontId, projectId] = fatherId.split(".");
  return { areaId, frontId, projectId };
}

function taskIsVisibleInProjectManagement(task: Task, todayKey: string) {
  const visibleByCompletion = !task.dueDate || task.dueDate === todayKey;
  return visibleByCompletion;
}

function orderTasksByDoneLast(tasks: Task[]) {
  return [...tasks].sort((a, b) => Number(Boolean(a.dueDate)) - Number(Boolean(b.dueDate)));
}

function formatVisibleFromDistance(visibleFrom: string | undefined, todayKey: string) {
  if (!visibleFrom || visibleFrom <= todayKey) return null;

  const visibleDate = parseInputDate(visibleFrom);
  const today = parseInputDate(todayKey);
  if (!visibleDate || !today) return null;

  const diffInDays = Math.ceil((visibleDate.getTime() - today.getTime()) / 86_400_000);
  if (diffInDays <= 0) return null;
  if (diffInDays === 1) return "Amanhã";
  return `Daqui ${diffInDays} dias`;
}

function parseInputDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDeadlineDistance(deadline: string) {
  const parsed = parseShortPortugueseDate(deadline);
  if (!parsed) return null;

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

function toFatherSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatFatherSegment(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
