import { ProgressBar } from "./ProgressBar";

interface Metric {
  label: string;
  done: number;
  total: number;
}

export function WeeklyAreaCard({
  title,
  metrics,
}: {
  title: string;
  metrics: Metric[];
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5">
      <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
        {title.toUpperCase()}
      </p>
      <div className="mt-4 space-y-3.5">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex items-baseline justify-between text-sm">
              <span>{m.label}</span>
              <span className="tabular text-muted-foreground">
                {m.done}/{m.total}
              </span>
            </div>
            <ProgressBar
              value={(m.done / m.total) * 100}
              className="mt-2"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
