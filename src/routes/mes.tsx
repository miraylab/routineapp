import { createFileRoute } from "@tanstack/react-router";
import { Check, TriangleAlert } from "lucide-react";

import { PageHeader } from "@/components/yuri/PageHeader";
import { ProgressBar } from "@/components/yuri/ProgressBar";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/mes")({
  head: () => ({
    meta: [
      { title: "Visão mensal · YURI OS" },
      {
        name: "description",
        content:
          "Progresso do mês por área, conquistas registradas e pontos que merecem atenção.",
      },
      { property: "og:title", content: "Visão mensal · YURI OS" },
      {
        property: "og:description",
        content: "Progresso do mês por área, conquistas e pontos de atenção.",
      },
    ],
  }),
  component: MesPage,
});

function MesPage() {
  const { monthView } = useStore();

  return (
    <div className="space-y-3">
      <PageHeader title="Mês" subtitle={monthView.month} back />

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <div className="space-y-4">
          {monthView.areas.map((a) => (
            <div key={a.title}>
              <div className="flex items-baseline justify-between text-sm">
                <span>{a.title}</span>
                <span className="tabular text-muted-foreground">
                  {a.progress}%
                </span>
              </div>
              <ProgressBar value={a.progress} className="mt-2" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
          CONQUISTAS DO MÊS
        </p>
        <ul className="mt-3 space-y-2.5 text-sm">
          {monthView.achievements.map((a) => (
            <li key={a} className="flex items-start gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
          EM ATENÇÃO
        </p>
        <ul className="mt-3 space-y-2.5 text-sm">
          {monthView.attention.map((a) => (
            <li key={a} className="flex items-start gap-2.5">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
