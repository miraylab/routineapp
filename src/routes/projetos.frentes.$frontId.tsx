import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Flag, Plus } from "lucide-react";

import { PageHeader } from "@/components/yuri/PageHeader";
import type { Category, Project, Task } from "@/data/mockData";
import { useStore } from "@/lib/store";
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
  const { projects, tasks, todayKey, toggleTask, addTask } = useStore();
  const front = useMemo(() => buildFrontDetail(frontId, projects, tasks), [frontId, projects, tasks]);
  const [draft, setDraft] = useState("");
  const [quick, setQuick] = useState(false);
  const [visibleFrom, setVisibleFrom] = useState("");
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

  const visibleTasks = front.tasks.filter((task) => taskIsVisibleToday(task, todayKey));
  const openTasks = visibleTasks.filter((task) => !task.dueDate);

  return (
    <div className="space-y-3">
      <PageHeader title={front.title} subtitle={front.area} back />

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
          DESCRIÇÃO
        </p>
        <p className="mt-2 text-[15px] leading-snug text-foreground">
          {front.description}
        </p>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
            TAREFAS DA FRENTE
          </p>
          <p className="tabular text-xs text-muted-foreground">{openTasks.length} abertas</p>
        </div>

        {visibleTasks.length > 0 ? (
          <ul className="app-scrollbar mt-3 max-h-[156px] space-y-2 overflow-y-auto pr-1">
            {visibleTasks.map((task) => {
              const done = Boolean(task.dueDate);
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    className="press relative flex w-full items-start gap-3 rounded-2xl bg-elevated/55 px-3.5 py-3 pr-8 text-left text-sm text-foreground"
                  >
                    {task.quick && !done ? (
                      <span className="absolute right-3 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary" />
                    ) : null}
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
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-snug text-muted-foreground">
            Nenhuma tarefa aberta nesta frente.
          </p>
        )}

        <form
          className="mt-3 space-y-2"
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
          }}
        >
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Adicionar tarefa"
              className="h-12 min-w-0 flex-1 rounded-2xl bg-elevated/50 px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setQuick((value) => !value)}
              className={cn(
                "press grid size-12 shrink-0 place-items-center rounded-2xl border",
                quick ? "border-primary text-primary" : "border-border text-muted-foreground",
              )}
              aria-label="Marcar como tarefa rápida"
              title="Menos de 5 minutos"
            >
              <Flag className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={visibleFrom}
              onChange={(event) => setVisibleFrom(event.target.value)}
              className="h-11 min-w-0 rounded-2xl bg-elevated/50 px-3.5 text-[13px] text-foreground outline-none focus:ring-1 focus:ring-ring"
              aria-label="Data de aparição"
            />
            <select
              value={recurrence}
              onChange={(event) =>
                setRecurrence(event.target.value as NonNullable<Task["recurrence"]>)
              }
              className="h-11 min-w-0 rounded-2xl bg-elevated/50 px-3.5 text-[13px] text-foreground outline-none focus:ring-1 focus:ring-ring"
              aria-label="Recorrência"
            >
              <option value="none">Sem recorrência</option>
              <option value="daily">Diária</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={!draft.trim()}
            className="press flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            <Plus className="size-4" />
            Adicionar tarefa
          </button>
        </form>
      </section>

      {front.projects.length > 0 ? (
        <section className="rounded-3xl border border-border/60 bg-card p-5">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
            PROJETOS
          </p>
          <div className="mt-3 space-y-2">
            {front.projects.map((project) => (
              <div key={project.id} className="rounded-2xl bg-elevated/45 px-3.5 py-3">
                <p className="truncate text-sm font-semibold">{project.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{project.nextAction}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

interface FrontDetail {
  id: string;
  title: string;
  area: Category;
  fatherId: string;
  description: string;
  tasks: Task[];
  projects: Project[];
}

function buildFrontDetail(frontId: string, projects: Project[], tasks: Task[]): FrontDetail | null {
  const frontProjects = projects.filter((project) => project.frontId === frontId);
  const firstProject = frontProjects[0];
  const directTasks = tasks.filter((task) => {
    const father = parseFatherId(task.fatherId);
    return father.frontId === frontId && !father.projectId;
  });

  if (firstProject) {
    return {
      id: frontId,
      title: firstProject.frontTitle,
      area: firstProject.category,
      fatherId: `${toFatherSegment(firstProject.category)}.${frontId}`,
      description: `Frente para organizar iniciativas, tarefas soltas e projetos ligados a ${firstProject.frontTitle}.`,
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
      description: "Espaço para capturar pendências pessoais e notas de alívio fora das frentes de trabalho.",
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
      description: "Frente operacional para agrupar tarefas soltas e próximos movimentos.",
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

function taskIsVisibleToday(task: Task, todayKey: string) {
  const visibleByStart = !task.visibleFrom || task.visibleFrom <= todayKey;
  const visibleByCompletion = !task.dueDate || task.dueDate === todayKey;
  return visibleByStart && visibleByCompletion;
}

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

function formatArea(areaId: string) {
  if (areaId === "miray") return "Miray";
  if (areaId === "michelin") return "Michelin";
  if (areaId === "estudos") return "Estudos";
  return "Pessoal";
}
