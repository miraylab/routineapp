import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronDown, Flag, Plus, X } from "lucide-react";

import { PageHeader } from "@/components/yuri/PageHeader";
import { StatusBadge } from "@/components/yuri/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProjectStatus } from "@/data/mockData";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projetos/$projectId")({
  head: () => ({
    meta: [
      { title: "Detalhe do projeto · YURI OS" },
      {
        name: "description",
        content: "Objetivo, status, prazo e histórico de tarefas do projeto selecionado.",
      },
      { property: "og:title", content: "Detalhe do projeto · YURI OS" },
      {
        property: "og:description",
        content: "Objetivo, status, prazo e histórico de tarefas do projeto.",
      },
    ],
  }),
  component: ProjetoDetalhe,
});

function ProjetoDetalhe() {
  const { projectId } = Route.useParams();
  const { projects, toggleProjectAction, addProjectAction, setProjectStatus } = useStore();
  const [draft, setDraft] = useState("");
  const [draftQuick, setDraftQuick] = useState(false);
  const [draftVisibleFrom, setDraftVisibleFrom] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [actionsDismissed, setActionsDismissed] = useState(false);
  const [addActionOpen, setAddActionOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const project = projects.find((p) => p.id === projectId);
  const visibleActions = orderActionsByDoneLast(project?.actions ?? []);
  const openActions = visibleActions.filter((action) => !action.dueDate).length;
  const showActions = visibleActions.length > 0 && !(actionsDismissed && openActions === 0);

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

      <div className="flex items-center justify-between gap-3">
        <StatusBadge tone="active" className="px-3 py-1.5 text-xs">
          {formatDeadlineDistance(project.deadline)}
        </StatusBadge>
        <div className="relative">
          <button
            type="button"
            onClick={() => setStatusOpen((open) => !open)}
            className={cn(
              "press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium tracking-wide",
              statusToneClass(project.status),
            )}
            aria-expanded={statusOpen}
          >
            {project.status}
            <ChevronDown className={cn("size-3.5 transition-transform", statusOpen && "rotate-180")} />
          </button>
          {statusOpen ? (
            <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-40 overflow-hidden rounded-2xl border border-border/60 bg-card p-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.36)]">
              {PROJECT_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setProjectStatus(project.id, status);
                    setStatusOpen(false);
                  }}
                  className={cn(
                    "press flex h-9 w-full items-center justify-between rounded-xl px-2.5 text-left text-xs text-muted-foreground",
                    project.status === status && "bg-primary/10 text-primary",
                  )}
                >
                  {status}
                  {project.status === status ? <Check className="size-3.5" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
          OBJETIVO
        </p>
        <p className="mt-2 text-[15px] leading-snug">{project.objective}</p>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
            HISTÓRICO DE TAREFAS
          </p>
          {showActions && openActions === 0 ? (
            <button
              type="button"
              onClick={() => setActionsDismissed(true)}
              className="press grid size-7 shrink-0 place-items-center rounded-xl bg-elevated/60 text-muted-foreground"
              aria-label="Fechar tarefas concluídas"
            >
              <X className="size-3.5" />
            </button>
          ) : showActions || visibleActions.length === 0 ? (
            <p className="tabular text-xs text-muted-foreground">{openActions} abertas</p>
          ) : null}
        </div>

        {showActions ? (
          <div className="mt-3 rounded-2xl bg-elevated/45 p-2">
            <ul className="app-scrollbar max-h-[190px] space-y-2 overflow-y-auto pr-1">
              {visibleActions.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => toggleProjectAction(project.id, a.id)}
                    className="press relative flex w-full items-start gap-3 rounded-2xl bg-card/70 px-3.5 py-3 pr-8 text-left text-sm text-foreground"
                  >
                    {a.quick && !a.dueDate ? (
                      <span className="absolute right-3 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary" />
                    ) : null}
                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-300",
                        a.dueDate
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-transparent",
                      )}
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 leading-snug",
                        a.dueDate && "text-muted-foreground line-through",
                      )}
                    >
                      {a.title}
                      {a.note ? (
                        <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                          {a.note}
                        </span>
                      ) : null}
                    </span>
                    {a.visibleFrom && !a.dueDate ? (
                      <span className="shrink-0">
                        <StatusBadge className="px-2 py-0.5 text-[10px]">
                          desde {a.visibleFrom}
                        </StatusBadge>
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setAddActionOpen(true)}
          className="press mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          <Plus className="size-4" />
          Adicionar tarefa
        </button>
      </section>

      <Dialog open={addActionOpen} onOpenChange={setAddActionOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[430px] rounded-3xl border-border/60 bg-card p-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base">Adicionar tarefa</DialogTitle>
            <DialogDescription>
              Nova tarefa dentro de {project.title}.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-2.5"
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
              setAddActionOpen(false);
            }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Descreva a tarefa"
              className="app-scrollbar h-28 w-full resize-none rounded-2xl bg-elevated/50 px-4 py-3 text-[15px] leading-snug outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            <div className="grid grid-cols-[48px_1fr] gap-2">
              <button
                type="button"
                onClick={() => setDraftQuick((value) => !value)}
                className={cn(
                  "press grid size-12 shrink-0 place-items-center rounded-2xl border",
                  draftQuick ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                )}
                aria-label="Marcar como tarefa rápida"
                title="Menos de 5 minutos"
              >
                <Flag className="size-4" />
              </button>
              <input
                type="date"
                value={draftVisibleFrom}
                onChange={(e) => setDraftVisibleFrom(e.target.value)}
                className="h-12 min-w-0 rounded-2xl bg-elevated/50 px-3.5 text-[13px] text-foreground outline-none focus:ring-1 focus:ring-ring"
                aria-label="Data de aparição"
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
              Adicionar tarefa
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function orderActionsByDoneLast<T extends { dueDate?: string }>(actions: T[]) {
  return [...actions].sort((a, b) => Number(Boolean(a.dueDate)) - Number(Boolean(b.dueDate)));
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
