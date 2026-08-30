import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

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
  const { projects, tasks } = useStore();
  const hierarchy = useMemo(() => buildProjectHierarchy(projects, tasks), [projects, tasks]);
  const [selectedArea, setSelectedArea] = useState<Category>(hierarchy[0]?.area ?? "Michelin");

  const currentArea = hierarchy.find((area) => area.area === selectedArea) ?? hierarchy[0];

  return (
    <div className="space-y-3">
      {currentArea ? <ProjectOverview area={currentArea} /> : null}

      <div className="app-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {hierarchy.map((area) => (
          <button
            key={area.area}
            type="button"
            onClick={() => setSelectedArea(area.area)}
            className={cn(
              "press h-11 w-24 shrink-0 rounded-2xl text-sm font-medium transition-colors",
              area.area === selectedArea
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground",
            )}
          >
            {area.area}
          </button>
        ))}
      </div>

      {currentArea ? (
        <div className="space-y-3">
          {currentArea.fronts.map((front) => (
            <FrontSection key={front.id} front={front} />
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

function FrontSection({ front }: { front: ProjectFront }) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-xl font-semibold tracking-tight">{front.title}</h2>
        <span className="tabular shrink-0 text-sm text-muted-foreground">
          {front.projects.length}
        </span>
      </div>

      {front.directTasks.length > 0 ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
              TAREFAS
            </p>
            <p className="tabular text-xs text-muted-foreground">
              {front.directTasks.filter((task) => task.status === "done").length} de{" "}
              {front.directTasks.length}
            </p>
          </div>
          <ul className="mt-2 space-y-2">
            {front.directTasks.map((task) => (
              <li
                key={task.id}
                className="rounded-2xl bg-elevated/55 px-3.5 py-2.5 text-sm text-foreground"
              >
                <span className={cn(task.status === "done" && "text-muted-foreground line-through")}>
                  {task.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {front.projects.length > 0 ? (
        <div className="mt-4">
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

const AREA_ORDER: Category[] = ["Michelin", "Miray", "Estudos"];

function buildProjectHierarchy(projects: Project[], tasks: Task[]): ProjectArea[] {
  const areas = AREA_ORDER.map((area) => {
    const areaProjects = projects.filter((project) => project.category === area);
    const directTasks = tasks.filter((task) => task.category === area && !task.projectId);
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
      const frontId = task.frontId ?? `${area.toLowerCase()}-geral`;
      const front = frontMap.get(frontId) ?? {
        id: frontId,
        title: "Geral",
        projects: [],
        directTasks: [],
      };
      front.directTasks.push(task);
      frontMap.set(frontId, front);
    });

    return {
      area,
      projects: areaProjects,
      fronts: Array.from(frontMap.values()).sort((a, b) => a.title.localeCompare(b.title)),
    };
  });

  return areas.filter((area) => area.fronts.length > 0);
}
