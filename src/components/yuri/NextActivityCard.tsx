import type { ScheduleBlock } from "@/data/mockData";

export function NextActivityCard({ blocks }: { blocks: ScheduleBlock[] }) {
  if (blocks.length === 0) {
    return (
      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
          PRÓXIMO
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Nada mais planejado para hoje.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5">
      <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
        PRÓXIMO
      </p>
      <ul className="mt-3 divide-y divide-border/60">
        {blocks.map((b) => (
          <li key={b.id} className="flex items-center gap-4 py-3">
            <span className="tabular w-12 shrink-0 text-sm font-medium text-muted-foreground">
              {b.startTime}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px]">{b.title}</p>
              {b.subtitle ? (
                <p className="truncate text-xs text-muted-foreground">
                  {b.subtitle}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
