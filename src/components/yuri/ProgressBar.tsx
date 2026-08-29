import { cn } from "@/lib/utils";

interface Props {
  value: number; // 0..100
  className?: string;
  tone?: "accent" | "muted";
  size?: "sm" | "md";
}

export function ProgressBar({
  value,
  className,
  tone = "accent",
  size = "sm",
}: Props) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-elevated",
        size === "sm" ? "h-1.5" : "h-2.5",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          tone === "accent" ? "bg-primary" : "bg-muted-foreground/50",
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
