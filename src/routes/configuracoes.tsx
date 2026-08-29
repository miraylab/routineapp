import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";

import { PageHeader } from "@/components/yuri/PageHeader";
import { useStore } from "@/lib/store";
import { WEEKDAYS, WEEKDAYS_SHORT } from "@/lib/schedule";
import { cn } from "@/lib/utils";

const presets = [
  { label: "Segunda 06:30", day: 1, time: "06:30" },
  { label: "Segunda 19:42", day: 1, time: "19:42" },
  { label: "Terça 07:45", day: 2, time: "07:45" },
  { label: "Quarta 15:30", day: 3, time: "15:30" },
  { label: "Sexta 19:30", day: 5, time: "19:30" },
  { label: "Sábado 14:30", day: 6, time: "14:30" },
  { label: "Domingo 17:20", day: 0, time: "17:20" },
];

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · YURI OS" },
      {
        name: "description",
        content:
          "Preferências do protótipo e modo demonstração para simular dia e horário do painel.",
      },
      { property: "og:title", content: "Configurações · YURI OS" },
      {
        property: "og:description",
        content: "Preferências e modo demonstração do YURI OS.",
      },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { simulation, setSimulation, resetState } = useStore();

  return (
    <div className="space-y-3">
      <PageHeader title="Configurações" subtitle="Protótipo · dados locais" back />

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[15px] font-medium">Modo demonstração</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Simula dia e horário para testar o comportamento contextual.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={simulation.enabled}
            onClick={() => setSimulation({ enabled: !simulation.enabled })}
            className={cn(
              "press relative h-7 w-12 shrink-0 rounded-full transition-colors",
              simulation.enabled ? "bg-primary" : "bg-elevated",
            )}
          >
            <span
              className={cn(
                "absolute top-1 size-5 rounded-full bg-background transition-all duration-300",
                simulation.enabled ? "left-6" : "left-1",
              )}
            />
          </button>
        </div>

        {simulation.enabled ? (
          <div className="rise mt-5 space-y-4 border-t border-border/60 pt-5">
            <div>
              <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
                DIA
              </p>
              <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {WEEKDAYS_SHORT.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSimulation({ dayOfWeek: i })}
                    className={cn(
                      "press h-11 min-w-12 flex-1 rounded-2xl text-xs font-medium",
                      simulation.dayOfWeek === i
                        ? "bg-primary text-primary-foreground"
                        : "bg-elevated/50 text-muted-foreground",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
                HORÁRIO
              </p>
              <input
                type="time"
                value={simulation.time}
                onChange={(e) => setSimulation({ time: e.target.value })}
                className="tabular mt-2 h-12 w-full rounded-2xl bg-elevated/50 px-4 text-[15px] outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
                CENÁRIOS
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() =>
                      setSimulation({ dayOfWeek: p.day, time: p.time })
                    }
                    className="press rounded-full bg-elevated/60 px-3.5 py-2 text-xs text-muted-foreground"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Simulando {WEEKDAYS[simulation.dayOfWeek]} às {simulation.time}.
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[15px] font-medium">Dados do protótipo</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Tudo é sintético e guardado apenas neste dispositivo.
        </p>
        <button
          type="button"
          onClick={resetState}
          className="press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-elevated py-3.5 text-sm font-medium text-muted-foreground"
        >
          <RotateCcw className="size-4" />
          Restaurar estado inicial
        </button>
      </section>
    </div>
  );
}
