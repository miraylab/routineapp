import { createFileRoute } from "@tanstack/react-router";

import { GoalCard } from "@/components/yuri/GoalCard";
import { PageHeader } from "@/components/yuri/PageHeader";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/objetivos")({
  head: () => ({
    meta: [
      { title: "Objetivos · YURI OS" },
      {
        name: "description",
        content:
          "Grandes objetivos de carreira, negócio, saúde, conhecimento e finanças, com metas do trimestre.",
      },
      { property: "og:title", content: "Objetivos · YURI OS" },
      {
        property: "og:description",
        content: "Grandes objetivos e metas do trimestre por área da vida.",
      },
    ],
  }),
  component: ObjetivosPage,
});

function ObjetivosPage() {
  const { goals } = useStore();

  return (
    <div>
      <PageHeader
        title="Objetivos"
        subtitle="Longo prazo e desdobramento trimestral"
        back
      />
      <div className="space-y-3">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} relatedCount={g.relatedProjects.length} />
        ))}
      </div>
    </div>
  );
}
