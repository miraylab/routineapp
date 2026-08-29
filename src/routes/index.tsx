import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { CurrentActivityCard } from "@/components/yuri/CurrentActivityCard";
import { NextActivityCard } from "@/components/yuri/NextActivityCard";
import { DailyProgress } from "@/components/yuri/DailyProgress";
import { PriorityItem } from "@/components/yuri/PriorityItem";
import { TimelineItem } from "@/components/yuri/TimelineItem";
import { useStore } from "@/lib/store";
import {
  MONTHS,
  WEEKDAYS,
  formatMinutes,
  greetingFor,
  toMinutes,
} from "@/lib/schedule";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hoje · YURI OS" },
      {
        name: "description",
        content:
          "Painel operacional pessoal: veja o que fazer agora, prioridades do dia e rotina completa.",
      },
      { property: "og:title", content: "Hoje · YURI OS" },
      {
        property: "og:description",
        content:
          "Painel operacional pessoal: agora, prioridades e rotina do dia.",
      },
    ],
  }),
  component: HojePage,
});

function HojePage() {
  const {
    context,
    nowMinutes,
    dayOfWeek,
    realNow,
    projects,
    tasks,
    todayGoal,
    blockDone,
    toggleTask,
    toggleBlock,
    addTask,
  } = useStore();
  const [draft, setDraft] = useState("");

  const { current, dayBlocks, past, upcoming } = context;
  const project = current?.projectId
    ? projects.find((p) => p.id === current.projectId)
    : undefined;

  const doneBlocks = dayBlocks.filter(
    (b) => blockDone(b.id) || past.includes(b),
  ).length;
  const prioritiesDone = tasks.filter((t) => t.status === "done").length;

  const weekdayLabel = WEEKDAYS[dayOfWeek];
  const fullDateLabel = `${realNow.getDate()} de ${MONTHS[realNow.getMonth()]}`;

  return (
    <div className="space-y-3">
      <header className="rise rounded-2xl bg-primary p-5 text-primary-foreground shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 max-w-[170px]">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {greetingFor(nowMinutes)}, Yuri
            </h1>
            <p className="mt-3 text-sm leading-snug text-primary-foreground/80">
              Sua meta de hoje:
              <br />
              <span className="font-medium text-primary-foreground">
                {todayGoal}
              </span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="tabular text-2xl font-semibold tracking-tight">
              {formatMinutes(nowMinutes)}
            </p>
            <p className="max-w-24 text-xs leading-tight text-primary-foreground/70">
              {fullDateLabel},
              <br />
              {weekdayLabel}
            </p>
          </div>
        </div>
      </header>

      <CurrentActivityCard
        context={context}
        project={project}
        done={current ? blockDone(current.id) : false}
        onToggleDone={() => current && toggleBlock(current.id)}
      />

      <NextActivityCard blocks={upcoming.slice(0, 3)} />

      <DailyProgress
        blocksDone={doneBlocks}
        blocksTotal={dayBlocks.length}
        prioritiesDone={prioritiesDone}
        prioritiesTotal={tasks.length}
      />

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
            RESULTADOS DE HOJE
          </p>
          <p className="tabular text-sm text-muted-foreground">
            {prioritiesDone} de {tasks.length}
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {tasks.map((t, i) => (
            <PriorityItem
              key={t.id}
              task={t}
              index={i}
              onToggle={() => toggleTask(t.id)}
            />
          ))}
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            addTask(draft.trim());
            setDraft("");
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Adicionar resultado"
            className="h-12 min-w-0 flex-1 rounded-2xl bg-elevated/50 px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            className="press grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"
            aria-label="Adicionar"
          >
            <Plus className="size-5" />
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="mb-4 text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
          ROTINA
        </p>
        <ul className="relative space-y-2 before:absolute before:bottom-4 before:left-[7px] before:top-4 before:w-px before:bg-border/70">
          {dayBlocks.map((b) => {
            const state =
              current?.id === b.id
                ? "current"
                : toMinutes(b.endTime) <= nowMinutes
                  ? "past"
                  : "future";
            return (
              <TimelineItem
                key={b.id}
                block={b}
                state={state}
                done={blockDone(b.id)}
                onToggle={() => toggleBlock(b.id)}
              />
            );
          })}
          {dayBlocks.length === 0 ? (
            <p className="pl-8 text-sm text-muted-foreground">
              Nenhum bloco planejado para hoje.
            </p>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
