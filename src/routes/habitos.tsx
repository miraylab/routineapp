import { createFileRoute } from "@tanstack/react-router";

import { HabitTracker } from "@/components/yuri/HabitTracker";
import { PageHeader } from "@/components/yuri/PageHeader";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/habitos")({
  head: () => ({
    meta: [
      { title: "Hábitos e saúde · YURI OS" },
      {
        name: "description",
        content:
          "Acompanhamento simples da semana: treinos, corrida, sono, leitura e sessões de estudo.",
      },
      { property: "og:title", content: "Hábitos e saúde · YURI OS" },
      {
        property: "og:description",
        content: "Treinos, corrida, sono, leitura e estudo na semana atual.",
      },
    ],
  }),
  component: HabitosPage,
});

function HabitosPage() {
  const { habits } = useStore();

  return (
    <div>
      <PageHeader title="Hábitos" subtitle="Semana atual" back />
      <HabitTracker habits={habits} />
    </div>
  );
}
