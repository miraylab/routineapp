import { Check } from "lucide-react";

import type { Task } from "@/data/mockData";
import { cn } from "@/lib/utils";

export function PriorityItem({
  task,
  index,
  onToggle,
}: {
  task: Task;
  index: number;
  onToggle: () => void;
}) {
  const done = Boolean(task.dueDate);
  return (
    <button
      type="button"
      onClick={onToggle}
      className="press flex w-full items-center gap-4 rounded-2xl bg-elevated/40 px-4 py-3.5 text-left"
    >
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border transition-colors duration-300",
          done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border text-transparent",
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[15px]",
            done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </span>
        <span className="block text-xs text-muted-foreground">
          {formatFatherId(task.fatherId)}
        </span>
      </span>
      <span className="tabular shrink-0 text-xs text-muted-foreground">
        {index + 1}
      </span>
    </button>
  );
}

function formatFatherId(fatherId: string) {
  return fatherId
    .split(".")
    .filter(Boolean)
    .map((part) =>
      part
        .split("-")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    )
    .join(" · ");
}
