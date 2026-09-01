import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ChevronRight, Plus, User, X } from "lucide-react";

import { StatusBadge } from "@/components/yuri/StatusBadge";
import type { Category, Project, Task } from "@/data/mockData";
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

function ProjetosPage() {
  const { projects, tasks, fronts, toggleTask, todayKey, addFront, addProject, addTask } = useStore();
  const hierarchy = useMemo(() => buildProjectHierarchy(projects, tasks, fronts), [fronts, projects, tasks]);
  const [selectedArea, setSelectedArea] = useState<Category>(hierarchy[0]?.area ?? "Michelin");
  const [addFrontOpen, setAddFrontOpen] = useState(false);
  const [frontTitle, setFrontTitle] = useState("");
  const [frontObjective, setFrontObjective] = useState("");

  const currentArea = hierarchy.find((area) => area.area === selectedArea) ?? hierarchy[0];

  return (
    <div className="space-y-3">
      {currentArea ? (
        <ProjectOverview
          area={currentArea}
          onAddFront={() => setAddFrontOpen(true)}
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
        <div className="space-y-3">
          {currentArea.fronts.length > 0 ? (
            currentArea.fronts.map((front) => (
              <FrontSection
                key={front.id}
                front={front}
                todayKey={todayKey}
                onToggleTask={toggleTask}
                onAddTask={addTask}
                onAddProject={addProject}
              />
            ))
          ) : (
            <section className="rounded-3xl border border-border/60 bg-card p-5">
              <p className="text-sm leading-snug text-muted-foreground">
                Nenhuma frente carregada para esta area.
              </p>
            </section>
          )}
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
              addFront(currentArea.area, frontTitle, frontObjective);
              setFrontTitle("");
              setFrontObjective("");
              setAddFrontOpen(false);
            }}
          >
            <input
              value={frontTitle}
              onChange={(event) => setFrontTitle(event.target.value)}
              placeholder="Nome da frente"
              className="h-12 w-full rounded-2xl bg-elevated/50 px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            <textarea
              value={frontObjective}
              onChange={(event) => setFrontObjective(event.target.value)}
              placeholder="Objetivo"
              className="app-scrollbar h-28 w-full resize-none rounded-2xl bg-elevated/50 px-4 py-3 text-[15px] leading-snug outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
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

function ProjectOverview({
  area,
  onAddFront,
}: {
  area: ProjectArea;
  onAddFront: () => void;
}) {
  return (
    <section
      className="relative min-h-32 rounded-3xl bg-primary shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
      aria-label={`Resumo visual de ${area.area}`}
    >
      <button
        type="button"
        onClick={onAddFront}
        className="press absolute right-4 top-4 grid size-8 place-items-center rounded-xl bg-background/12 text-primary-foreground backdrop-blur-sm"
        aria-label={`Adicionar frente em ${area.area}`}
      >
        <Plus className="size-4" />
      </button>
    </section>
  );
}

function FrontSection({
  front,
  todayKey,
  onToggleTask,
  onAddTask,
  onAddProject,
}: {
  front: ProjectFront;
  todayKey: string;
  onToggleTask: (id: string) => void;
  onAddTask: (title: string, fatherId?: string) => void;
  onAddProject: (input: {
    category: Category;
    frontId: string;
    frontTitle: string;
    title: string;
    objective?: string;
    deadline?: string;
  }) => void;
}) {
  const navigate = useNavigate();
  const [tasksDismissed, setTasksDismissed] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectObjective, setProjectObjective] = useState("");
  const visibleDirectTasks = orderTasksByDoneLast(
    front.directTasks.filter((task) => taskIsVisibleToday(task, todayKey)),
  );
  const openDirectTasks = visibleDirectTasks.filter((task) => !task.dueDate);
  const showTaskList = visibleDirectTasks.length > 0 && !(tasksDismissed && openDirectTasks.length === 0);
  const hasFrontContent = showTaskList || front.projects.length > 0;
  const fatherId = `${toFatherSegment(front.area)}.${front.id}`;
  const openFrontDetail = () => {
    navigate({ to: "/projetos/frentes/$frontId", params: { frontId: front.id } });
  };

  return (
    <section
      role="button"
      tabIndex={0}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("[data-projects-block],button,a,input,textarea")) {
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
        <h2
          className={cn(
            "min-w-0 truncate font-semibold tracking-tight",
            hasFrontContent ? "text-xl" : "text-base",
          )}
        >
          {front.title}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="press grid size-8 place-items-center rounded-xl bg-elevated/60 text-muted-foreground"
                aria-label={`Adicionar em ${front.title}`}
              >
                <Plus className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 rounded-2xl border-border/60 bg-card p-1.5 text-foreground"
            >
              <DropdownMenuItem
                onClick={() => setAddTaskOpen(true)}
                className="rounded-xl px-3 py-2.5 text-sm"
              >
                Adicionar tarefa
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setAddProjectOpen(true)}
                className="rounded-xl px-3 py-2.5 text-sm"
              >
                Adicionar projeto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={openFrontDetail}
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
                  {openDirectTasks.length} abertas
                </p>
              ) : null}
            </div>
          </div>

          <ul className="app-scrollbar mt-3 max-h-[190px] space-y-2 overflow-y-auto pr-1">
            {visibleDirectTasks.map((task) => {
              const taskDone = Boolean(task.dueDate);
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    className="press relative flex w-full items-start gap-3 rounded-2xl bg-card/70 px-3.5 py-3 pr-7 text-left text-sm text-foreground"
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
                    {task.quick && !taskDone ? (
                      <span className="absolute right-3 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary" />
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
          <div className="mt-2 space-y-2">
            {front.projects.map((project) => (
              <ProjectRow key={project.id} project={project} todayKey={todayKey} />
            ))}
          </div>
        </div>
      ) : null}

      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[430px] rounded-3xl border-border/60 bg-card p-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base">Adicionar tarefa</DialogTitle>
            <DialogDescription>Nova tarefa em {front.title}.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!taskTitle.trim()) return;
              onAddTask(taskTitle, fatherId);
              setTaskTitle("");
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
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[430px] rounded-3xl border-border/60 bg-card p-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base">Adicionar projeto</DialogTitle>
            <DialogDescription>Novo projeto em {front.title}.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!projectTitle.trim()) return;
              onAddProject({
                category: front.area,
                frontId: front.id,
                frontTitle: front.title,
                title: projectTitle,
                objective: projectObjective,
              });
              setProjectTitle("");
              setProjectObjective("");
              setAddProjectOpen(false);
            }}
          >
            <input
              value={projectTitle}
              onChange={(event) => setProjectTitle(event.target.value)}
              placeholder="Nome do projeto"
              className="h-12 w-full rounded-2xl bg-elevated/50 px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            <textarea
              value={projectObjective}
              onChange={(event) => setProjectObjective(event.target.value)}
              placeholder="Objetivo"
              className="app-scrollbar h-28 w-full resize-none rounded-2xl bg-elevated/50 px-4 py-3 text-[15px] leading-snug outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
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

function ProjectRow({ project, todayKey }: { project: Project; todayKey: string }) {
  const openActions = project.actions.filter(
    (action) => !action.dueDate && (!action.visibleFrom || action.visibleFrom <= todayKey),
  ).length;

  return (
    <Link
      to="/projetos/$projectId"
      params={{ projectId: project.id }}
      className="press flex items-stretch gap-3 rounded-2xl border border-border/60 bg-elevated/45 px-3.5 py-3"
    >
      <div className="min-w-0 flex-1 py-0.5">
        <h4 className="min-w-0 truncate text-base font-semibold leading-tight">{project.title}</h4>
        <div className="mt-1.5 flex items-center">
          <StatusBadge tone="active" className="px-2 py-0.5 text-[10px]">
            {formatDeadlineDistance(project.deadline)}
          </StatusBadge>
        </div>
      </div>
      <span
        className={cn(
          "tabular grid w-12 shrink-0 place-items-center rounded-xl bg-card/65 text-base font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
          openActions === 0 && "text-muted-foreground",
        )}
        aria-label={`${openActions} tarefas em aberto`}
        title={openActions === 0 ? "Nenhuma tarefa em aberto" : `${openActions} tarefas em aberto`}
      >
        {openActions}
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
  projects: Project[];
  directTasks: Task[];
}

interface ProjectArea {
  area: Category;
  projects: Project[];
  fronts: ProjectFront[];
}

const AREA_ORDER: Category[] = ["Michelin", "Miray", "Estudos", "Pessoal"];

function buildProjectHierarchy(projects: Project[], tasks: Task[], fronts: ManagedFront[]): ProjectArea[] {
  const areas = AREA_ORDER.map((area) => {
    const areaId = toFatherSegment(area);
    const areaProjects = projects.filter((project) => project.category === area);
    const directTasks = tasks.filter((task) => {
      const father = parseFatherId(task.fatherId);
      return father.areaId === areaId && !father.projectId;
    });
    const frontMap = new Map<string, ProjectFront>();

    areaProjects.forEach((project) => {
      const front = frontMap.get(project.frontId) ?? {
        id: project.frontId,
        area,
        title: project.frontTitle,
        projects: [],
        directTasks: [],
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
        projects: [],
        directTasks: [],
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
          });
          return;
        }
        frontMap.set(front.id, {
          id: front.id,
          area: front.area,
          title: front.title,
          projects: [],
          directTasks: [],
        });
      });

    return {
      area,
      projects: areaProjects,
      fronts: Array.from(frontMap.values()).sort((a, b) => a.title.localeCompare(b.title)),
    };
  });

  return areas;
}

function parseFatherId(fatherId: string) {
  const [areaId, frontId, projectId] = fatherId.split(".");
  return { areaId, frontId, projectId };
}

function taskIsVisibleToday(task: Task, todayKey: string) {
  const visibleByStart = !task.visibleFrom || task.visibleFrom <= todayKey;
  const visibleByCompletion = !task.dueDate || task.dueDate === todayKey;
  return visibleByStart && visibleByCompletion;
}

function orderTasksByDoneLast(tasks: Task[]) {
  return [...tasks].sort((a, b) => Number(Boolean(a.dueDate)) - Number(Boolean(b.dueDate)));
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

function toFatherSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function formatFatherSegment(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
