import { useState } from "react";

import type { ScheduleBlock } from "@/data/mockData";
import { cn } from "@/lib/utils";

type State = "past" | "current" | "future";

export function TimelineItem({ block, state }: { block: ScheduleBlock; state: State }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="relative pl-8">
      <span
        className={cn(
          "absolute left-[7px] top-5 size-2.5 -translate-x-1/2 rounded-full",
          state === "current"
            ? "live-dot bg-primary ring-4 ring-primary/15"
            : state === "past"
              ? "bg-muted-foreground/50"
              : "bg-border",
        )}
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "press w-full rounded-2xl px-4 py-3.5 text-left",
          state === "current" ? "border border-primary/25 bg-card" : "bg-card/40",
          state === "past" && "opacity-55",
        )}
      >
        <div className="flex items-center gap-3">
          <span className="tabular w-11 shrink-0 text-sm text-muted-foreground">
            {block.startTime}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={cn("block truncate text-[15px]", state === "current" && "font-medium")}
            >
              {block.title}
            </span>
            {block.subtitle ? (
              <span className="block truncate text-xs text-muted-foreground">{block.subtitle}</span>
            ) : null}
          </span>
          {state === "current" ? (
            <span className="shrink-0 text-[11px] font-medium tracking-wide text-primary">
              agora
            </span>
          ) : null}
        </div>

        {open ? (
          <div className="rise mt-3 space-y-2 border-t border-border/60 pt-3 text-sm text-muted-foreground">
            <p className="tabular">
              {block.startTime} — {block.endTime} · {block.category}
            </p>
            {block.description ? <p>{block.description}</p> : null}
            {block.nextAction ? <p className="text-foreground">{block.nextAction}</p> : null}
          </div>
        ) : null}
      </button>
    </li>
  );
}
