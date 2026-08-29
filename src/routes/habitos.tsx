import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Footprints, Moon } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { HabitTracker } from "@/components/yuri/HabitTracker";
import { PageHeader } from "@/components/yuri/PageHeader";
import { ProgressBar } from "@/components/yuri/ProgressBar";
import { useStore } from "@/lib/store";

const DAILY_STEPS_GOAL = 6000;
const DAILY_SLEEP_GOAL_HOURS = 8;

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
  const [health, setHealth] = useState<HealthRecentResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<"loading" | "ready" | "mock" | "error">(
    "loading",
  );

  useEffect(() => {
    let active = true;

    fetch("/api/health/recent")
      .then(async (response) => {
        const payload = (await response.json()) as HealthRecentResponse;
        if (!response.ok) {
          throw new Error(payload.message ?? "Falha ao carregar dados de saúde.");
        }
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setHealth(payload);
        setHealthStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        loadMockHealth().then((mockHealth) => {
          if (!active) return;
          setHealth(mockHealth);
          setHealthStatus(mockHealth ? "mock" : "error");
        });
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-3">
      <PageHeader title="Hábitos" subtitle="Semana atual" back />
      <HealthMetricCards health={health} status={healthStatus} />
      <HabitTracker habits={habits} />
    </div>
  );
}

interface HealthTodayResponse {
  available: boolean;
  date?: string;
  message?: string;
  steps?: {
    value: number | null;
  };
  sleep?: {
    seconds: number | null;
    minutes: number | null;
    hours: number | null;
  };
}

interface HealthRecentResponse {
  oldest?: string;
  newest?: string;
  source?: "intervals.icu" | "mock";
  message?: string;
  days?: HealthTodayResponse[];
}

function HealthMetricCards({
  health,
  status,
}: {
  health: HealthRecentResponse | null;
  status: "loading" | "ready" | "mock" | "error";
}) {
  const days = health?.days ?? [];
  const today = days.find((day) => day.date === health?.newest);
  const steps = today?.steps?.value;
  const sleepMinutes = today?.sleep?.minutes;
  const stepsHistory = days.map((day) => ({
    date: formatDateShort(day.date),
    value: day.steps?.value ?? null,
    goalMet: (day.steps?.value ?? 0) >= DAILY_STEPS_GOAL,
  }));
  const sleepHistory = days.map((day) => ({
    date: formatDateShort(day.date),
    value: day.sleep?.hours ?? null,
    goalMet: (day.sleep?.hours ?? 0) >= DAILY_SLEEP_GOAL_HOURS,
  }));

  return (
    <section className="space-y-3">
      <HealthMetricCard
        icon={Footprints}
        label="Passos"
        value={formatSteps(steps)}
        goalLabel="Meta 6.000"
        progress={getGoalProgress(steps, DAILY_STEPS_GOAL)}
        detail={status === "loading" ? "Carregando" : ""}
        data={stepsHistory}
        goalValue={DAILY_STEPS_GOAL}
        muted={status !== "ready" || steps === null || steps === undefined}
      />
      <HealthMetricCard
        icon={Moon}
        label="Sono"
        value={formatSleep(sleepMinutes)}
        goalLabel="Meta 8h"
        progress={getGoalProgress(sleepMinutes, DAILY_SLEEP_GOAL_HOURS * 60)}
        detail={status === "loading" ? "Carregando" : ""}
        data={sleepHistory}
        goalValue={DAILY_SLEEP_GOAL_HOURS}
        muted={status !== "ready" || sleepMinutes === null || sleepMinutes === undefined}
      />
    </section>
  );
}

async function loadMockHealth() {
  if (!import.meta.env.DEV) return null;
  const { mockHealthRecent } = await import("@/data/mock/health");
  return mockHealthRecent satisfies HealthRecentResponse;
}

function HealthMetricCard({
  icon: Icon,
  label,
  value,
  goalLabel,
  progress,
  detail,
  data,
  goalValue,
  muted,
}: {
  icon: typeof Footprints;
  label: string;
  value: string;
  goalLabel: string;
  progress: number | null;
  detail: string;
  data: HealthMetricPoint[];
  goalValue: number;
  muted: boolean;
}) {
  const chartMax = getChartMax(data, goalValue);

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
          {label.toUpperCase()}
        </p>
        <Icon className="size-4 shrink-0 text-primary" strokeWidth={1.9} />
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p
            className={
              muted
                ? "tabular text-2xl font-semibold text-muted-foreground"
                : "tabular text-2xl font-semibold"
            }
          >
            {value}
          </p>
          <div className="mt-3">
            <ProgressBar value={progress ?? 0} />
            <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] font-medium text-muted-foreground">
              <span>{goalLabel}</span>
              <span>{progress === null ? "--" : `${Math.round(progress)}%`}</span>
            </div>
          </div>
        </div>
        <div className="h-20 w-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 2, bottom: 4, left: 2 }}
              barCategoryGap={0}
            >
              <XAxis dataKey="date" axisLine={false} hide tickLine={false} />
              <YAxis domain={[0, chartMax]} hide />
              <Bar
                dataKey="value"
                barSize={6}
                fill="var(--color-primary)"
                radius={[3, 3, 3, 3]}
                shape={<HealthMetricBar />}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function getChartMax(data: HealthMetricPoint[], goal: number) {
  const values = data
    .map((point) => point.value)
    .filter((value): value is number => value !== null && value !== undefined);
  const maxValue = Math.max(goal, ...values);
  return Math.ceil(maxValue * 1.15);
}

interface HealthMetricPoint {
  date: string;
  value: number | null;
  goalMet: boolean;
}

function HealthMetricBar({
  x,
  y,
  width,
  height,
  payload,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: HealthMetricPoint;
}) {
  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined ||
    payload?.value === null
  ) {
    return null;
  }

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={Math.min(3, width / 2)}
      ry={Math.min(3, width / 2)}
      fill={payload?.goalMet ? "var(--color-primary)" : "oklch(0.68 0.2 12)"}
    />
  );
}

function getGoalProgress(value: number | null | undefined, goal: number) {
  if (value === null || value === undefined) return null;
  return Math.min(100, (value / goal) * 100);
}

function formatSteps(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return value.toLocaleString("pt-BR");
}

function formatSleep(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return "--";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h${String(rest).padStart(2, "0")}`;
}

function formatDateShort(date: string | undefined) {
  if (!date) return "";
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}
