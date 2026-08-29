import { ProgressBar } from "./ProgressBar";

export function DailyProgress({
  blocksDone,
  blocksTotal,
  prioritiesDone,
  prioritiesTotal,
}: {
  blocksDone: number;
  blocksTotal: number;
  prioritiesDone: number;
  prioritiesTotal: number;
}) {
  const pct = blocksTotal ? (blocksDone / blocksTotal) * 100 : 0;

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
          HOJE
        </p>
        <p className="tabular text-sm font-medium">{Math.round(pct)}%</p>
      </div>

      <ProgressBar value={pct} className="mt-3" />

      <div className="tabular mt-4 grid grid-cols-2 gap-3">
        <Stat value={`${blocksDone} / ${blocksTotal}`} label="Blocos da rotina" />
        <Stat
          value={`${prioritiesDone} / ${prioritiesTotal}`}
          label="Prioridades"
        />
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-elevated/50 px-4 py-3">
      <p className="text-lg font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
