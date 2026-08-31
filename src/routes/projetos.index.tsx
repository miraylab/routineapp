import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ChevronRight, User } from "lucide-react";

import { ProgressBar } from "@/components/yuri/ProgressBar";
import { StatusBadge, healthTone } from "@/components/yuri/StatusBadge";
import type { Category, Project, Task } from "@/data/mockData";
import { useStore } from "@/lib/store";
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
  const { projects, tasks, toggleTask, todayKey } = useStore();
  const hierarchy = useMemo(() => buildProjectHierarchy(projects, tasks), [projects, tasks]);
  const [selectedArea, setSelectedArea] = useState<Category>(hierarchy[0]?.area ?? "Michelin");

  const currentArea = hierarchy.find((area) => area.area === selectedArea) ?? hierarchy[0];

  return (
    <div className="space-y-3">
      {currentArea ? <ProjectOverview area={currentArea} /> : null}

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
          {currentArea.fronts.map((front) => (
            <FrontSection
              key={front.id}
              front={front}
              todayKey={todayKey}
              onToggleTask={toggleTask}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProjectOverview({ area }: { area: ProjectArea }) {
  return (
    <section
      className="min-h-32 rounded-3xl bg-primary shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
      aria-label={`Resumo visual de ${area.area}`}
    />
  );
}

function FrontSection({
  front,
  todayKey,
  onToggleTask,
}: {
  front: ProjectFront;
  todayKey: string;
  onToggleTask: (id: string) => void;
}) {
  const navigate = useNavigate();
  const visibleDirectTasks = front.directTasks.filter((task) => taskIsVisibleToday(task, todayKey));
  const openDirectTasks = visibleDirectTasks.filter((task) => !task.dueDate);
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
      className="press rounded-3xl border border-border/60 bg-card p-5 text-left"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-xl font-semibold tracking-tight">{front.title}</h2>
        <button
          type="button"
          onClick={openFrontDetail}
          className="press grid size-8 shrink-0 place-items-center rounded-xl bg-elevated/60 text-muted-foreground"
          aria-label={`Abrir frente ${front.title}`}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {visibleDirectTasks.length > 0 ? (
        <div className="mt-4 rounded-2xl bg-elevated/45 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
              TAREFAS
            </p>
            <p className="tabular text-xs text-muted-foreground">
              {openDirectTasks.length} abertas
            </p>
          </div>
          <ul className="app-scrollbar mt-3 max-h-[156px] space-y-2 overflow-y-auto pr-1">
            {visibleDirectTasks.map((task) => {
              const taskDone = Boolean(task.dueDate);
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
          className={cn(visibleDirectTasks.length > 0 ? "mt-4" : "mt-3")}
        >
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
            PROJETOS
          </p>
          <div className="mt-2 space-y-2">
            {front.projects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </div>
        </div>
      ) : null}

      {visibleDirectTasks.length === 0 && front.projects.length === 0 ? (
        <p className="mt-3 text-sm leading-snug text-muted-foreground">
          Nenhuma tarefa aberta por enquanto.
        </p>
      ) : null}
    </section>
  );
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <Link
      to="/projetos/$projectId"
      params={{ projectId: project.id }}
      className="press block rounded-2xl border border-border/60 bg-elevated/45 px-3.5 py-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="min-w-0 truncate text-sm font-semibold">{project.title}</h4>
            <StatusBadge tone={healthTone(project.health)}>{project.health}</StatusBadge>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{project.nextAction}</p>
        </div>
        <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      </div>

      <div className="tabular mt-3 flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{project.deadline}</span>
        <span className="font-medium text-foreground">{project.progress}%</span>
      </div>
      <ProgressBar value={project.progress} className="mt-1.5" />
    </Link>
  );
}

interface ProjectFront {
  id: string;
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

function buildProjectHierarchy(projects: Project[], tasks: Task[]): ProjectArea[] {
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
        title: father.frontId ? formatFatherSegment(father.frontId) : "Geral",
        projects: [],
        directTasks: [],
      };
      front.directTasks.push(task);
      frontMap.set(frontId, front);
    });

    if (area === "Pessoal" && frontMap.size === 0) {
      frontMap.set("pessoal-notas-de-alivio", {
        id: "pessoal-notas-de-alivio",
        title: "Notas de alívio",
        projects: [],
        directTasks: [],
      });
    }

    return {
      area,
      projects: areaProjects,
      fronts: Array.from(frontMap.values()).sort((a, b) => a.title.localeCompare(b.title)),
    };
  });

  return areas.filter((area) => area.fronts.length > 0);
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
