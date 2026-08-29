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
    <div className="space-y-4">
      <header className="rise mb-2">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {greetingFor(nowMinutes)}, Yuri
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>
          </div>
          <p className="tabular shrink-0 text-2xl font-medium tracking-tight text-muted-foreground">
            {formatMinutes(nowMinutes)}
          </p>
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
