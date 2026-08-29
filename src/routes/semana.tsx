import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { PageHeader } from "@/components/yuri/PageHeader";
import { ProgressBar } from "@/components/yuri/ProgressBar";
import { WeeklyAreaCard } from "@/components/yuri/WeeklyAreaCard";
import { useStore } from "@/lib/store";
import { WEEKDAYS_SHORT, blocksForDay } from "@/lib/schedule";
import { schedule } from "@/data/mockData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/semana")({
  head: () => ({
    meta: [
      { title: "Semana · YURI OS" },
      {
        name: "description",
        content:
          "Foco da semana, resultados-chave e progresso por área: carreira, negócio, saúde e estudos.",
      },
      { property: "og:title", content: "Semana · YURI OS" },
      {
        property: "og:description",
        content: "Foco da semana, resultados-chave e progresso por área.",
      },
    ],
  }),
  component: SemanaPage,
});

function SemanaPage() {
  const { weekFocus, weekAreas, keyResults, toggleKeyResult, dayOfWeek } =
    useStore();
  const [selectedDay, setSelectedDay] = useState(dayOfWeek);

  const totals = weekAreas.flatMap((a) => a.metrics);
  const overall =
    (totals.reduce((s, m) => s + m.done, 0) /
      totals.reduce((s, m) => s + m.total, 0)) *
    100;

  const dayBlocks = blocksForDay(schedule, selectedDay);

  return (
    <div className="space-y-3">
      <PageHeader title="Semana" subtitle={weekFocus.range} />

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
            PROGRESSO GERAL
          </p>
          <p className="tabular text-sm font-medium">{Math.round(overall)}%</p>
        </div>
        <ProgressBar value={overall} className="mt-3" size="md" />
      </section>

      <section className="rounded-3xl border border-primary/25 bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium tracking-[0.18em] text-primary">
            FOCO DA SEMANA
          </p>
          <span className="text-xs text-muted-foreground">
            Restam {weekFocus.daysLeft} dias
          </span>
        </div>
        <h2 className="mt-3 text-xl font-semibold leading-snug tracking-tight">
          {weekFocus.title}
        </h2>

        <p className="mt-5 text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
          RESULTADOS-CHAVE
        </p>
        <ul className="mt-2.5 space-y-2">
          {keyResults.map((kr) => (
            <li key={kr.id}>
              <button
                type="button"
                onClick={() => toggleKeyResult(kr.id)}
                className="press flex w-full items-center gap-3 rounded-2xl bg-elevated/40 px-4 py-3 text-left"
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-300",
                    kr.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-transparent",
                  )}
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    kr.done && "text-muted-foreground line-through",
                  )}
                >
                  {kr.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-3">
        {weekAreas.map((a) => (
          <WeeklyAreaCard key={a.id} title={a.title} metrics={a.metrics} />
        ))}
      </div>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
          VISÃO DOS DIAS
        </p>
        <div className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {WEEKDAYS_SHORT.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setSelectedDay(i)}
              className={cn(
                "press h-11 min-w-12 flex-1 rounded-2xl text-xs font-medium transition-colors",
                selectedDay === i
                  ? "bg-primary text-primary-foreground"
                  : "bg-elevated/50 text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <ul className="mt-4 divide-y divide-border/60">
          {dayBlocks.map((b) => (
            <li key={b.id} className="flex items-center gap-4 py-2.5">
              <span className="tabular w-11 shrink-0 text-sm text-muted-foreground">
                {b.startTime}
              </span>
              <span className="min-w-0 truncate text-sm">{b.title}</span>
            </li>
          ))}
          {dayBlocks.length === 0 ? (
            <li className="py-3 text-sm text-muted-foreground">
              Dia livre de compromissos.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
