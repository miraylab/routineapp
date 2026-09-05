import { useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ChevronDown, Flag, Pencil, Plus, X } from "lucide-react";

import { PageHeader } from "@/components/yuri/PageHeader";
import { StatusBadge } from "@/components/yuri/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Category, Project, ProjectStatus, Task } from "@/data/mockData";
import { useStore, type ManagedFront } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projetos/frentes/$frontId")({
  head: () => ({
    meta: [
      { title: "Frente · YURI OS" },
      {
        name: "description",
        content: "Aprofundamento da frente com descrição, tarefas abertas e projetos ligados.",
      },
    ],
  }),
  component: FrenteDetalhe,
});

function FrenteDetalhe() {
  const { frontId } = Route.useParams();
  const navigate = useNavigate();
  const {
    projects,
    tasks,
    fronts,
    todayKey,
    frontStatuses,
    toggleTask,
    addTask,
    addProject,
    setFrontStatus,
    updateFrontObjective,
  } = useStore();
  const front = useMemo(
    () => buildFrontDetail(frontId, fronts, projects, tasks, frontStatuses),
    [frontId, frontStatuses, fronts, projects, tasks],
  );
  const [draft, setDraft] = useState("");
  const [quick, setQuick] = useState(false);
  const [visibleFrom, setVisibleFrom] = useState("");
  const [objectiveDraft, setObjectiveDraft] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectObjective, setProjectObjective] = useState("");
  const [projectDeadline, setProjectDeadline] = useState("");
  const [projectError, setProjectError] = useState("");
  const [tasksDismissed, setTasksDismissed] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editObjectiveOpen, setEditObjectiveOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [recurrence, setRecurrence] =
    useState<NonNullable<Task["recurrence"]>>("none");

  if (!front) {
    return (
      <div>
        <PageHeader title="Frente não encontrada" back />
        <p className="text-sm text-muted-foreground">
          Esta frente ainda não existe na estrutura atual.
        </p>
      </div>
    );
  }

  const visibleTasks = orderTasksByDoneLast(front.tasks);
  const openTasks = visibleTasks.filter((task) => !task.dueDate);
  const showTasks = visibleTasks.length > 0 && !(tasksDismissed && openTasks.length === 0);

  return (
    <div className="space-y-3">
      <PageHeader
        title={front.title}
        subtitle={front.area}
        back
        onBack={() =>
          navigate({
            to: "/projetos/",
            search: { area: front.area, front: front.id },
          })
        }
      />

      <div className="flex justify-end">
        <div className="relative">
          <button
            type="button"
            onClick={() => setStatusOpen((open) => !open)}
            className={cn(
              "press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium tracking-wide",
              statusToneClass(front.status),
            )}
            aria-expanded={statusOpen}
          >
            {front.status}
            <ChevronDown className={cn("size-3.5 transition-transform", statusOpen && "rotate-180")} />
          </button>
          {statusOpen ? (
            <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-40 overflow-hidden rounded-2xl border border-border/60 bg-card p-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.36)]">
              {PROJECT_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setFrontStatus(front.id, status);
                    setStatusOpen(false);
                  }}
                  className={cn(
                    "press flex h-9 w-full items-center justify-between rounded-xl px-2.5 text-left text-xs text-muted-foreground",
                    front.status === status && "bg-primary/10 text-primary",
                  )}
                >
                  {status}
                  {front.status === status ? <Check className="size-3.5" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
            OBJETIVO
          </p>
          <button
            type="button"
            onClick={() => {
              setObjectiveDraft(front.objective);
              setEditObjectiveOpen(true);
            }}
            className="press -mr-1 grid size-6 shrink-0 place-items-center text-muted-foreground/70"
            aria-label="Editar objetivo da frente"
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
        <p className="mt-2 text-[15px] leading-snug text-foreground">
          {front.objective}
        </p>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
            HISTÓRICO DE TAREFAS
          </p>
          {showTasks && openTasks.length === 0 ? (
            <button
              type="button"
              onClick={() => setTasksDismissed(true)}
              className="press grid size-7 shrink-0 place-items-center rounded-xl bg-elevated/60 text-muted-foreground"
              aria-label="Fechar tarefas concluídas"
            >
              <X className="size-3.5" />
            </button>
          ) : showTasks || visibleTasks.length === 0 ? (
            <p className="tabular text-xs text-muted-foreground">{openTasks.length} abertas</p>
          ) : null}
        </div>

        {showTasks ? (
          <div className="mt-3 rounded-2xl bg-elevated/45 p-2">
            <ul className="app-scrollbar max-h-[190px] space-y-2 overflow-y-auto pr-1">
              {visibleTasks.map((task) => {
                const done = Boolean(task.dueDate);
                const visibleFromLabel = formatVisibleFromDistance(task.visibleFrom, todayKey);
                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className="press flex w-full items-start gap-3 rounded-2xl bg-card/70 px-3.5 py-3 text-left text-sm text-foreground"
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-200",
                          done
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-transparent",
                        )}
                      >
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 leading-snug",
                          done && "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                      </span>
                      {visibleFromLabel || (task.quick && !done) ? (
                        <span className="ml-auto flex shrink-0 items-center gap-2">
                          {visibleFromLabel ? (
                            <span className="rounded-full bg-elevated px-2.5 py-1 text-[11px] font-medium leading-none text-muted-foreground">
                              {visibleFromLabel}
                            </span>
                          ) : null}
                          {task.quick && !done ? (
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
        ) : visibleTasks.length === 0 ? (
          <p className="mt-3 text-sm leading-snug text-muted-foreground">
            Nenhuma tarefa aberta nesta frente.
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => setAddTaskOpen(true)}
          className="press mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          <Plus className="size-4" />
          Adicionar tarefa
        </button>
      </section>

      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[430px] rounded-3xl border-border/60 bg-card p-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base">Adicionar tarefa</DialogTitle>
            <DialogDescription>
              Nova tarefa dentro de {front.title}.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              const title = draft.trim();
              if (!title) return;
              addTask(title, front.fatherId, {
                quick,
                visibleFrom: visibleFrom || undefined,
                recurrence,
              });
              setDraft("");
              setQuick(false);
              setVisibleFrom("");
              setRecurrence("none");
              setAddTaskOpen(false);
            }}
          >
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Descreva a tarefa"
              className="app-scrollbar h-28 w-full resize-none rounded-2xl bg-elevated/50 px-4 py-3 text-[15px] leading-snug outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            <div className="grid grid-cols-[48px_1fr] gap-2">
              <button
                type="button"
                onClick={() => setQuick((value) => !value)}
                className={cn(
                  "press grid size-12 shrink-0 place-items-center rounded-2xl border",
                  quick ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                )}
                aria-label="Marcar como tarefa rápida"
                title="Menos de 5 minutos"
              >
                <Flag className="size-4" />
              </button>
              <input
                type="date"
                value={visibleFrom}
                onChange={(event) => setVisibleFrom(event.target.value)}
                className="h-12 min-w-0 rounded-2xl bg-elevated/50 px-3.5 text-[13px] text-foreground outline-none focus:ring-1 focus:ring-ring"
                aria-label="Data de aparição"
              />
            </div>
            <select
              value={recurrence}
              onChange={(event) =>
                setRecurrence(event.target.value as NonNullable<Task["recurrence"]>)
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
              disabled={!draft.trim()}
              className="press flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            >
              <Plus className="size-4" />
              Adicionar tarefa
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
          PROJETOS
        </p>
        {front.projects.length > 0 ? (
          <div className="mt-3 space-y-2">
            {front.projects.map((project) => (
              <ProjectRow key={project.id} project={project} todayKey={todayKey} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-snug text-muted-foreground">
            Nenhum projeto cadastrado nesta frente.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setProjectError("");
            setAddProjectOpen(true);
          }}
          className="press mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-elevated/70 px-4 text-sm font-medium text-muted-foreground"
        >
          <Plus className="size-4" />
          Adicionar Projeto
        </button>
      </section>

      <Dialog open={editObjectiveOpen} onOpenChange={setEditObjectiveOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[430px] rounded-3xl border-border/60 bg-card p-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base">Editar objetivo</DialogTitle>
            <DialogDescription>
              Ajuste o objetivo da frente {front.title}.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              updateFrontObjective(front.id, objectiveDraft);
              setEditObjectiveOpen(false);
            }}
          >
            <textarea
              value={objectiveDraft}
              onChange={(event) => setObjectiveDraft(event.target.value)}
              className="app-scrollbar h-36 w-full resize-none rounded-2xl bg-elevated/50 px-4 py-3 text-[15px] leading-snug outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              className="press flex h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Salvar objetivo
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addProjectOpen} onOpenChange={setAddProjectOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[430px] rounded-3xl border-border/60 bg-card p-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base">Adicionar projeto</DialogTitle>
            <DialogDescription>
              Novo projeto dentro de {front.title}.
            </DialogDescription>
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
              const created = addProject({
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
              Adicionar Projeto
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
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

interface FrontDetail {
  id: string;
  title: string;
  area: Category;
  fatherId: string;
  status: ProjectStatus;
  objective: string;
  tasks: Task[];
  projects: Project[];
}

function buildFrontDetail(
  frontId: string,
  fronts: ManagedFront[],
  projects: Project[],
  tasks: Task[],
  frontStatuses: Record<string, ProjectStatus>,
): FrontDetail | null {
  const frontRecord = fronts.find((front) => front.id === frontId);
  const frontProjects = projects.filter((project) => project.frontId === frontId);
  const firstProject = frontProjects[0];
  const status = frontStatuses[frontId] ?? frontRecord?.status ?? "Em andamento";
  const directTasks = tasks.filter((task) => {
    const father = parseFatherId(task.fatherId);
    return father.frontId === frontId && !father.projectId;
  });

  if (frontRecord) {
    return {
      id: frontRecord.id,
      title: frontRecord.title,
      area: frontRecord.area,
      fatherId: `${toFatherSegment(frontRecord.area)}.${frontRecord.id}`,
      status,
      objective: frontRecord.objective,
      tasks: directTasks,
      projects: frontProjects,
    };
  }

  if (firstProject) {
    return {
      id: frontId,
      title: firstProject.frontTitle,
      area: firstProject.category,
      fatherId: `${toFatherSegment(firstProject.category)}.${frontId}`,
      status,
      objective: `Frente para organizar iniciativas, tarefas soltas e projetos ligados a ${firstProject.frontTitle}.`,
      tasks: directTasks,
      projects: frontProjects,
    };
  }

  if (frontId === "pessoal-notas-de-alivio") {
    return {
      id: frontId,
      title: "Notas de alívio",
      area: "Pessoal",
      fatherId: "pessoal.pessoal-notas-de-alivio",
      status,
      objective: "Espaço para capturar pendências pessoais e notas de alívio fora das frentes de trabalho.",
      tasks: directTasks,
      projects: [],
    };
  }

  if (directTasks.length > 0) {
    const father = parseFatherId(directTasks[0].fatherId);
    return {
      id: frontId,
      title: formatFatherSegment(frontId),
      area: father.areaId ? (formatArea(father.areaId) as Category) : "Pessoal",
      fatherId: `${father.areaId ?? "pessoal"}.${frontId}`,
      status,
      objective: "Frente operacional para agrupar tarefas soltas e próximos movimentos.",
      tasks: directTasks,
      projects: [],
    };
  }

  return null;
}

function parseFatherId(fatherId: string) {
  const [areaId, frontId, projectId] = fatherId.split(".");
  return { areaId, frontId, projectId };
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

const PROJECT_STATUSES: ProjectStatus[] = ["Em andamento", "Concluído", "Arquivado"];

function statusToneClass(status: ProjectStatus) {
  if (status === "Concluído") return "bg-primary/12 text-primary";
  if (status === "Arquivado") return "bg-elevated text-muted-foreground";
  return "bg-warning/12 text-warning";
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

function formatArea(areaId: string) {
  if (areaId === "miray") return "Miray";
  if (areaId === "michelin") return "Michelin";
  if (areaId === "estudos") return "Estudos";
  return "Pessoal";
}
