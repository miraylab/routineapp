import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";

import { PageHeader } from "@/components/yuri/PageHeader";
import { useStore } from "@/lib/store";
import {
  fetchBodyWeightGoal,
  upsertBodyWeightGoal,
  type BodyWeightGoal,
} from "@/lib/supabaseBodyProgress";
import { useAuth } from "@/lib/supabaseAuth";
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
  const { session } = useAuth();
  const { simulation, setSimulation, resetState } = useStore();
  const [weightGoal, setWeightGoal] = useState<BodyWeightGoal | null>(null);
  const [goalDraft, setGoalDraft] = useState("");
  const [goalStatus, setGoalStatus] = useState<"idle" | "loading" | "saving" | "error" | "saved">(
    "loading",
  );

  useEffect(() => {
    let active = true;
    setGoalStatus("loading");

    fetchBodyWeightGoal(session?.accessToken)
      .then((goal) => {
        if (!active) return;
        setWeightGoal(goal);
        setGoalDraft(goal ? formatWeightDraft(String(Math.round(goal.targetWeightKg * 1000))) : "");
        setGoalStatus("idle");
      })
      .catch(() => {
        if (!active) return;
        setGoalStatus("error");
      });

    return () => {
      active = false;
    };
  }, [session?.accessToken]);

  async function handleGoalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.user.id || goalStatus === "saving") return;

    const targetWeightKg = parseWeightDraftKg(goalDraft);
    if (!Number.isFinite(targetWeightKg) || targetWeightKg <= 0) {
      setGoalStatus("error");
      return;
    }

    setGoalStatus("saving");
    try {
      const nextGoal = await upsertBodyWeightGoal({
        userId: session.user.id,
        targetWeightKg,
        currentGoalId: weightGoal?.id,
      });
      setWeightGoal(nextGoal);
      setGoalDraft(formatWeightDraft(String(Math.round(nextGoal.targetWeightKg * 1000))));
      setGoalStatus("saved");
    } catch {
      setGoalStatus("error");
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader title="Configurações" subtitle="Protótipo · dados locais" back />

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[15px] font-medium">Saúde</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Configurações usadas no acompanhamento físico.
        </p>

        <form className="mt-4 flex gap-2" onSubmit={handleGoalSubmit}>
          <label className="relative min-w-0 flex-1">
            <input
              value={goalDraft}
              onChange={(event) => {
                setGoalDraft(formatWeightDraft(event.target.value));
                setGoalStatus("idle");
              }}
              inputMode="numeric"
              placeholder="Meta de peso"
              className="h-11 w-full rounded-2xl border border-border/70 bg-background px-4 pr-10 text-sm outline-none focus:border-primary"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
              kg
            </span>
          </label>
          <button
            type="submit"
            disabled={!session?.user.id || goalStatus === "loading" || goalStatus === "saving"}
            className="press h-11 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
          >
            {goalStatus === "saving" ? "Salvando" : "Salvar"}
          </button>
        </form>

        {goalStatus === "error" ? (
          <p className="mt-2 text-xs text-destructive">Não consegui salvar a meta agora.</p>
        ) : goalStatus === "saved" ? (
          <p className="mt-2 text-xs text-muted-foreground">Meta salva.</p>
        ) : null}
      </section>

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

function formatWeightDraft(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  if (!digits) return "";

  const padded = digits.padStart(4, "0");
  const kg = padded.slice(0, -3).replace(/^0+(?=\d)/, "");
  const grams = padded.slice(-3);
  return `${kg}.${grams}`;
}

function parseWeightDraftKg(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return Number.NaN;
  return Number(digits) / 1000;
}
