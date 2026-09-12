import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Camera, Dumbbell, Footprints, Images, Moon } from "lucide-react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/yuri/PageHeader";
import { ProgressBar } from "@/components/yuri/ProgressBar";
import {
  createBodyImageEntry,
  createBodyWeightEntry,
  fetchBodyWeightEntries,
  type BodyWeightEntry,
} from "@/lib/supabaseBodyProgress";
import { useAuth } from "@/lib/supabaseAuth";
import { cn } from "@/lib/utils";

const DAILY_STEPS_GOAL = 6000;
const DAILY_SLEEP_GOAL_HOURS = 8;

export const Route = createFileRoute("/saude")({
  head: () => ({
    meta: [
      { title: "Saúde · YURI OS" },
      {
        name: "description",
        content: "Acompanhamento de passos, sono e evolução física.",
      },
      { property: "og:title", content: "Saúde · YURI OS" },
      {
        property: "og:description",
        content: "Passos, sono, peso e registro visual de evolução física.",
      },
    ],
  }),
  component: SaudePage,
});

function SaudePage() {
  const { session } = useAuth();
  const [health, setHealth] = useState<HealthRecentResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<"loading" | "ready" | "mock" | "error">(
    "loading",
  );
  const [weightEntries, setWeightEntries] = useState<BodyWeightEntry[]>([]);
  const [weightStatus, setWeightStatus] = useState<"loading" | "ready" | "error">("loading");

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

  useEffect(() => {
    let active = true;
    setWeightStatus("loading");

    fetchBodyWeightEntries(session?.accessToken)
      .then((entries) => {
        if (!active) return;
        setWeightEntries(entries);
        setWeightStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setWeightStatus("error");
      });

    return () => {
      active = false;
    };
  }, [session?.accessToken]);

  return (
    <div className="space-y-3">
      <PageHeader title="Saúde" subtitle="Semana atual" back />
      <HealthMetricCards health={health} status={healthStatus} />
      <BodyProgressCard
        userId={session?.user.id}
        entries={weightEntries}
        status={weightStatus}
        onWeightCreated={(entry) => {
          setWeightEntries((current) =>
            [...current, entry].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)),
          );
          setWeightStatus("ready");
        }}
      />
    </div>
  );
}

function BodyProgressCard({
  userId,
  entries,
  status,
  onWeightCreated,
}: {
  userId: string | undefined;
  entries: BodyWeightEntry[];
  status: "loading" | "ready" | "error";
  onWeightCreated: (entry: BodyWeightEntry) => void;
}) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [weightDraft, setWeightDraft] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState("");

  const chartData = useMemo(
    () =>
      entries.map((entry) => ({
        date: formatDateShort(entry.measuredAt.slice(0, 10)),
        weight: entry.weightKg,
      })),
    [entries],
  );
  const latestWeight = entries.at(-1)?.weightKg;

  async function handleWeightSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || savingWeight) return;

    const weightKg = parseWeightDraftKg(weightDraft);
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      setMessage("Informe um peso válido.");
      return;
    }

    setSavingWeight(true);
    setMessage("");
    try {
      const entry = await createBodyWeightEntry({ userId, weightKg });
      onWeightCreated(entry);
      setWeightDraft("");
      setMessage("Peso registrado.");
    } catch {
      setMessage("Não consegui salvar o peso agora.");
    } finally {
      setSavingWeight(false);
    }
  }

  async function handleImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !userId || uploadingImage) return;

    setUploadingImage(true);
    setMessage("");
    try {
      await createBodyImageEntry({ userId, imageFile: file });
      setMessage("Imagem registrada no histórico.");
    } catch {
      setMessage("Não consegui salvar a imagem agora.");
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Acompanhamento do físico
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            {latestWeight ? `${formatWeight(latestWeight)} kg` : "Sem peso registrado"}
          </h2>
        </div>
        <Dumbbell className="size-5 shrink-0 text-primary" strokeWidth={1.9} />
      </div>

      <form className="mt-5 flex gap-2" onSubmit={handleWeightSubmit}>
        <label className="relative min-w-0 flex-1">
          <input
            value={weightDraft}
            onChange={(event) => setWeightDraft(formatWeightDraft(event.target.value))}
            inputMode="numeric"
            placeholder="000.000"
            className="h-11 w-full rounded-2xl border border-border/70 bg-background px-4 pr-10 text-sm outline-none focus:border-primary"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
            kg
          </span>
        </label>
        <button
          type="submit"
          disabled={!userId || savingWeight}
          className="press h-11 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
        >
          {savingWeight ? "Salvando" : "Salvar"}
        </button>
      </form>

      <div className="mt-5 h-28 rounded-2xl bg-background/60 p-3">
        {status === "loading" ? (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">
            Carregando histórico
          </div>
        ) : chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 6, left: 8 }}>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-primary)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">
            O gráfico aparece quando houver pelo menos dois registros.
          </div>
        )}
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelected}
      />

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!userId || uploadingImage}
          onClick={() => imageInputRef.current?.click()}
          className="press flex h-11 items-center justify-center gap-2 rounded-2xl bg-elevated/70 px-3 text-sm font-medium text-foreground disabled:text-muted-foreground"
        >
          <Camera className="size-4" strokeWidth={1.9} />
          {uploadingImage ? "Enviando" : "Foto"}
        </button>
        <Link
          to="/saude/imagens"
          className="press flex h-11 items-center justify-center gap-2 rounded-2xl bg-elevated/70 px-3 text-sm font-medium text-foreground"
        >
          <Images className="size-4" strokeWidth={1.9} />
          Histórico
        </Link>
      </div>

      {message ? (
        <p
          className={cn(
            "mt-3 text-xs",
            message.includes("Não") || message.includes("válido")
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {message}
        </p>
      ) : null}
    </section>
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

function formatWeight(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
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

function formatDateShort(date: string | undefined) {
  if (!date) return "";
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}
