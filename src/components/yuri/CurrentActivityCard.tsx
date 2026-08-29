import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";
import type { CurrentActivity } from "@/lib/schedule";
import { formatDuration } from "@/lib/schedule";
import type { Project } from "@/data/mockData";
import { cn } from "@/lib/utils";

interface Props {
  context: CurrentActivity;
  project?: Project | undefined;
  done: boolean;
  onToggleDone: () => void;
}

export function CurrentActivityCard({
  context,
  project,
  done,
  onToggleDone,
}: Props) {
  const [open, setOpen] = useState(false);
  const { current, next, progress, remaining } = context;

  if (!current) {
    return (
      <section className="rise rounded-3xl border border-border/60 bg-card p-6">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
          TEMPO LIVRE
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          Nenhuma atividade planejada
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {next
            ? `Nenhum compromisso até ${next.startTime}. Aproveite sem precisar otimizar este período.`
            : "Nada mais planejado para hoje."}
        </p>
        {next ? (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-elevated/60 px-4 py-3">
            <span className="tabular text-sm font-medium text-primary">
              {next.startTime}
            </span>
            <span className="text-sm text-muted-foreground">{next.title}</span>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rise overflow-hidden rounded-3xl border border-primary/25 bg-card">
      <div className="p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium tracking-[0.18em] text-primary">
            AGORA
          </p>
          <StatusBadge tone={done ? "done" : "active"}>
            <span
              className={cn(
                "size-1.5 rounded-full bg-current",
                !done && "live-dot",
              )}
            />
            {done ? "Concluído" : "Em andamento"}
          </StatusBadge>
        </div>

        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {current.category}
        </p>
        <h2 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">
          {current.title}
        </h2>
        {current.subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {current.subtitle}
          </p>
        ) : null}

        <div className="tabular mt-5 flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">
            {current.startTime} — {current.endTime}
          </span>
          <span className="font-medium text-foreground">
            Restam {formatDuration(remaining)}
          </span>
        </div>
        <ProgressBar value={progress} className="mt-2.5" size="md" />
        <p className="mt-2 text-xs text-muted-foreground">
          {Math.round(progress)}% do bloco concluído
        </p>

        {current.nextAction ? (
          <div className="mt-5 rounded-2xl bg-elevated/60 p-4">
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
              PRÓXIMA AÇÃO
            </p>
            <p className="mt-1.5 text-[15px] leading-snug">
              {current.nextAction}
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onToggleDone}
          className={cn(
            "press mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-medium",
            done
              ? "bg-elevated text-muted-foreground"
              : "bg-primary text-primary-foreground",
          )}
        >
          <Check className="size-4" />
          {done ? "Concluído · desfazer" : "Concluir"}
        </button>

        {project || current.description || current.expectedResult ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="press mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-sm text-muted-foreground"
          >
            {open ? "Ocultar detalhes" : "Ver detalhes"}
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-300",
                open && "rotate-180",
              )}
            />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="rise space-y-4 border-t border-border/60 bg-elevated/30 px-6 py-5 text-sm">
          {current.description ? (
            <Detail label="Atividade" value={current.description} />
          ) : null}
          {project ? (
            <>
              <Detail
                label="Projeto"
                value={`${project.title} · ${project.progress}%`}
              />
              <Detail label="Objetivo relacionado" value={project.objective} />
            </>
          ) : null}
          {current.expectedResult ? (
            <Detail label="Resultado esperado" value={current.expectedResult} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
        {label.toUpperCase()}
      </p>
      <p className="mt-1 leading-snug">{value}</p>
    </div>
  );
}
