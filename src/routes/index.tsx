import { createFileRoute } from "@tanstack/react-router";

import { CurrentActivityCard } from "@/components/yuri/CurrentActivityCard";
import { NextActivityCard } from "@/components/yuri/NextActivityCard";
import { DailyProgress } from "@/components/yuri/DailyProgress";
import { useStore } from "@/lib/store";
import { MONTHS, WEEKDAYS, formatMinutes, greetingFor } from "@/lib/schedule";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agora · YURI OS" },
      {
        name: "description",
        content:
          "Painel operacional pessoal: veja o que fazer agora, o que vem depois e como o dia está progredindo.",
      },
      { property: "og:title", content: "Agora · YURI OS" },
      {
        property: "og:description",
        content:
          "Painel operacional pessoal: o que fazer agora, o que vem depois e o progresso do dia.",
      },
    ],
  }),
  component: AgoraPage,
});

function AgoraPage() {
  const {
    context,
    nowMinutes,
    dayOfWeek,
    realNow,
    projects,
    tasks,
    todayGoal,
    blockDone,
    toggleBlock,
  } = useStore();

  const { current, dayBlocks, past, upcoming } = context;
  const project = current?.projectId
    ? projects.find((p) => p.id === current.projectId)
    : undefined;

  const doneBlocks = dayBlocks.filter(
    (b) => blockDone(b.id) || past.includes(b),
  ).length;
  const prioritiesDone = tasks.filter((t) => t.status === "done").length;

  const dateLabel = `${WEEKDAYS[dayOfWeek]}, ${realNow.getDate()} de ${MONTHS[realNow.getMonth()]}`;

  return (
    <div className="space-y-3">
      <header className="rise rounded-2xl bg-primary p-5 text-primary-foreground shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {greetingFor(nowMinutes)}, Yuri
            </h1>
            <p className="mt-3 text-sm leading-snug text-primary-foreground/80">
              Sua meta de hoje é:{" "}
              <span className="text-primary-foreground">{todayGoal}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="max-w-28 text-xs leading-tight text-primary-foreground/70">
              {dateLabel}
            </p>
            <p className="tabular mt-1 text-2xl font-semibold tracking-tight">
              {formatMinutes(nowMinutes)}
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
    </div>
  );
}
