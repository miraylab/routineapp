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
  const { projects, toggleProjectAction, addProjectAction, todayKey } = useStore();
  const [draft, setDraft] = useState("");
  const [draftQuick, setDraftQuick] = useState(false);
  const [draftVisibleFrom, setDraftVisibleFrom] = useState("");
  const [draftNote, setDraftNote] = useState("");

  const project = projects.find((p) => p.id === projectId);
  const visibleActions =
    project?.actions.filter((action) => actionIsVisibleToday(action, todayKey)) ?? [];
  const openActions = visibleActions.filter((action) => !action.dueDate).length;

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
    <div className="space-y-3">
      <PageHeader title={project.title} subtitle={`${project.category} · ${project.frontTitle}`} back />

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
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
            PRÓXIMAS AÇÕES
          </p>
          <p className="tabular text-xs text-muted-foreground">{openActions} abertas</p>
        </div>
        {visibleActions.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {visibleActions.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => toggleProjectAction(project.id, a.id)}
                  className="press relative flex w-full items-center gap-3 rounded-2xl bg-elevated/40 px-4 py-3 pr-8 text-left"
                >
                  {a.quick && !a.dueDate ? (
                    <span className="absolute right-3 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary" />
                  ) : null}
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-300",
                      a.dueDate
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-transparent",
                    )}
                  >
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-sm",
                      a.dueDate && "text-muted-foreground line-through",
                    )}
                  >
                    {a.title}
                  </span>
                  {a.visibleFrom && (
                    <span className="flex shrink-0 flex-wrap justify-end gap-1">
                      <StatusBadge>desde {a.visibleFrom}</StatusBadge>
                    </span>
                  )}
                </button>
                {a.note ? (
                  <p className="mt-1 px-4 text-xs leading-snug text-muted-foreground">{a.note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            addProjectAction(project.id, draft.trim(), {
              quick: draftQuick,
              visibleFrom: draftVisibleFrom || undefined,
              note: draftNote.trim() || undefined,
            });
            setDraft("");
            setDraftQuick(false);
            setDraftVisibleFrom("");
            setDraftNote("");
          }}
        >
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Adicionar ação"
              className="h-12 min-w-0 flex-1 rounded-2xl bg-elevated/50 px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setDraftQuick((value) => !value)}
              className={cn(
                "press h-12 shrink-0 rounded-2xl border px-3 text-xs font-medium",
                draftQuick ? "border-primary text-primary" : "border-border text-muted-foreground",
              )}
              aria-label="Marcar como tarefa rápida"
            >
              {"<5min"}
            </button>
          </div>
          <div className="grid gap-2">
            <input
              value={draftVisibleFrom}
              onChange={(e) => setDraftVisibleFrom(e.target.value)}
              placeholder="Mostrar em"
              className="h-11 min-w-0 rounded-2xl bg-elevated/50 px-3.5 text-[13px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
          </div>
          <textarea
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            placeholder="Nota"
            className="app-scrollbar h-20 w-full resize-none rounded-2xl bg-elevated/50 px-3.5 py-3 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="press flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            <Plus className="size-4" />
            Adicionar ação
          </button>
        </form>
      </section>
    </div>
  );
}

function actionIsVisibleToday(
  action: { dueDate?: string; visibleFrom?: string },
  todayKey: string,
) {
  const visibleByStart = !action.visibleFrom || action.visibleFrom <= todayKey;
  const visibleByCompletion = !action.dueDate || action.dueDate === todayKey;
  return visibleByStart && visibleByCompletion;
}
