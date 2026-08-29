import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { ProgressBar } from "./ProgressBar";
import { StatusBadge, healthTone } from "./StatusBadge";
import type { Project } from "@/data/mockData";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to="/projetos/$projectId"
      params={{ projectId: project.id }}
      className="press block rounded-3xl border border-border/60 bg-card p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
            {project.category.toUpperCase()}
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold tracking-tight">
            {project.title}
          </h2>
        </div>
        <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
      </div>

      <div className="tabular mt-4 flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{project.status}</span>
        <span className="font-medium">{project.progress}%</span>
      </div>
      <ProgressBar value={project.progress} className="mt-2" />

      <div className="mt-4 space-y-1.5 text-sm">
        <p className="text-muted-foreground">
          Próxima ação:{" "}
          <span className="text-foreground">{project.nextAction}</span>
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <StatusBadge tone={healthTone(project.health)}>
          {project.health}
        </StatusBadge>
        <StatusBadge>{project.deadline}</StatusBadge>
      </div>
    </Link>
  );
}
