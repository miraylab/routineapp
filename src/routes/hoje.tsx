import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/yuri/PageHeader";
import { PriorityItem } from "@/components/yuri/PriorityItem";
import { TimelineItem } from "@/components/yuri/TimelineItem";
import { useStore } from "@/lib/store";
import { MONTHS, WEEKDAYS, toMinutes } from "@/lib/schedule";

export const Route = createFileRoute("/hoje")({
  head: () => ({
    meta: [
      { title: "Hoje · YURI OS" },
      {
        name: "description",
        content:
          "Timeline vertical do dia com blocos da rotina e até três resultados prioritários.",
      },
      { property: "og:title", content: "Hoje · YURI OS" },
      {
        property: "og:description",
        content: "Timeline do dia e os resultados prioritários de hoje.",
      },
    ],
  }),
  component: HojePage,
});

function HojePage() {
  const { context, nowMinutes, dayOfWeek, realNow, tasks, toggleTask, addTask, todayKey } = useStore();
  const [draft, setDraft] = useState("");

  const visibleTasks = orderTasksByDoneLast(tasks.filter((t) => taskIsVisibleToday(t, todayKey)));
  const openTasks = visibleTasks.filter((t) => !t.dueDate).length;

  return (
    <div>
      <PageHeader
        title="Hoje"
        subtitle={`${WEEKDAYS[dayOfWeek]}, ${realNow.getDate()} de ${MONTHS[realNow.getMonth()]}`}
      />

      <section className="mb-4 rounded-3xl border border-border/60 bg-card p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
            RESULTADOS DE HOJE
          </p>
          <p className="tabular text-sm text-muted-foreground">
            {openTasks} abertas
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {visibleTasks.map((t, i) => (
            <PriorityItem key={t.id} task={t} index={i} onToggle={() => toggleTask(t.id)} />
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

      <p className="mb-4 text-[11px] font-medium tracking-[0.18em] text-muted-foreground">ROTINA</p>
      <ul className="relative space-y-2 before:absolute before:bottom-4 before:left-[7px] before:top-4 before:w-px before:bg-border/70">
        {context.dayBlocks.map((b) => {
          const state =
            context.current?.id === b.id
              ? "current"
              : toMinutes(b.endTime) <= nowMinutes
                ? "past"
                : "future";
          return <TimelineItem key={b.id} block={b} state={state} />;
        })}
        {context.dayBlocks.length === 0 ? (
          <p className="pl-8 text-sm text-muted-foreground">Nenhum bloco planejado para hoje.</p>
        ) : null}
      </ul>
    </div>
  );
}

function taskIsVisibleToday(task: { dueDate?: string; visibleFrom?: string }, todayKey: string) {
  const visibleByStart = !task.visibleFrom || task.visibleFrom <= todayKey;
  const visibleByCompletion = !task.dueDate || task.dueDate === todayKey;
  return visibleByStart && visibleByCompletion;
}

function orderTasksByDoneLast<T extends { dueDate?: string }>(tasks: T[]) {
  return [...tasks].sort((a, b) => Number(Boolean(a.dueDate)) - Number(Boolean(b.dueDate)));
}
