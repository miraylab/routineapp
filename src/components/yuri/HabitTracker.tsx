import type { Habit } from "@/data/mockData";
import { cn } from "@/lib/utils";

export function HabitTracker({ habits }: { habits: Habit[] }) {
  return (
    <div className="space-y-3">
      {habits.map((h) => (
        <section
          key={h.id}
          className="rounded-3xl border border-border/60 bg-card p-5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[15px] font-medium">{h.title}</p>
            <p className="tabular text-sm text-muted-foreground">
              {h.note ?? `${h.weeklyCompleted} / ${h.weeklyTarget}`}
            </p>
          </div>
          <div className="mt-3.5 flex gap-1.5">
            {Array.from({ length: h.weeklyTarget }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2 flex-1 rounded-full transition-colors duration-500",
                  i < h.weeklyCompleted ? "bg-primary" : "bg-elevated",
                )}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
