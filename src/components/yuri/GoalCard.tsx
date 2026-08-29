import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { ProgressBar } from "./ProgressBar";
import type { Goal } from "@/data/mockData";
import { cn } from "@/lib/utils";

export function GoalCard({
  goal,
  relatedCount,
}: {
  goal: Goal;
  relatedCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-3xl border border-border/60 bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="press w-full p-5 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
              {goal.area.toUpperCase()}
            </p>
            <p className="mt-1.5 text-[15px] leading-snug">{goal.title}</p>
          </div>
          <ChevronDown
            className={cn(
              "mt-1 size-5 shrink-0 text-muted-foreground transition-transform duration-300",
              open && "rotate-180",
            )}
          />
        </div>
        <div className="tabular mt-4 flex items-center gap-3">
          <ProgressBar value={goal.progress} />
          <span className="shrink-0 text-sm text-muted-foreground">
            {goal.progress}%
          </span>
        </div>
      </button>

      {open ? (
        <div className="rise border-t border-border/60 bg-elevated/30 px-5 py-4">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
            TRIMESTRE
          </p>
          <ul className="mt-2.5 space-y-2 text-sm">
            {goal.quarter.map((q) => (
              <li key={q} className="flex gap-2.5">
                <span className="text-primary">→</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            {relatedCount === 0
              ? "Nenhum projeto vinculado"
              : `${relatedCount} projeto${relatedCount > 1 ? "s" : ""} relacionado${relatedCount > 1 ? "s" : ""}`}
          </p>
        </div>
      ) : null}
    </section>
  );
}
