import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus } from "lucide-react";

import { PageHeader } from "@/components/yuri/PageHeader";
import { ProgressBar } from "@/components/yuri/ProgressBar";
import { StatusBadge, healthTone } from "@/components/yuri/StatusBadge";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projetos/$projectId")({
  head: () => ({
    meta: [
      { title: "Detalhe do projeto · YURI OS" },
      {
        name: "description",
        content:
          "Objetivo, progresso, marco atual e próximas ações do projeto selecionado.",
      },
      { property: "og:title", content: "Detalhe do projeto · YURI OS" },
      {
        property: "og:description",
        content: "Objetivo, marco atual e próximas ações do projeto.",
      },
    ],
  }),
  component: ProjetoDetalhe,
});

function ProjetoDetalhe() {
  const { projectId } = Route.useParams();
  const { projects, toggleProjectAction, addProjectAction } = useStore();
  const [draft, setDraft] = useState("");

  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <div>
        <PageHeader title="Projeto não encontrado" back />
        <p className="text-sm text-muted-foreground">
          Este projeto não existe mais na sua lista.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={project.title} subtitle={project.category} back />

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
          OBJETIVO
        </p>
        <p className="mt-2 text-[15px] leading-snug">{project.objective}</p>

        <div className="tabular mt-5 flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-medium">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} className="mt-2" size="md" />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge tone={healthTone(project.health)}>
            {project.health}
          </StatusBadge>
          <StatusBadge>{project.status}</StatusBadge>
          <StatusBadge>Prazo {project.deadline}</StatusBadge>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
          MARCO ATUAL
        </p>
        <p className="mt-2 text-[15px]">{project.nextMilestone}</p>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
          PRÓXIMAS AÇÕES
        </p>
        <ul className="mt-3 space-y-2">
          {project.actions.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => toggleProjectAction(project.id, a.id)}
                className="press flex w-full items-center gap-3 rounded-2xl bg-elevated/40 px-4 py-3 text-left"
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-300",
                    a.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-transparent",
                  )}
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 text-sm",
                    a.done && "text-muted-foreground line-through",
                  )}
                >
                  {a.title}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            addProjectAction(project.id, draft.trim());
            setDraft("");
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Adicionar ação"
            className="h-12 min-w-0 flex-1 rounded-2xl bg-elevated/50 px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            className="press grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"
            aria-label="Adicionar ação"
          >
            <Plus className="size-5" />
          </button>
        </form>
      </section>
    </div>
  );
}
