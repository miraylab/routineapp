import { cn } from "@/lib/utils";

type Tone = "neutral" | "active" | "attention" | "late" | "done";

const tones: Record<Tone, string> = {
  neutral: "bg-elevated text-muted-foreground",
  active: "bg-primary/12 text-primary",
  attention: "bg-warning/12 text-warning",
  late: "bg-destructive/14 text-destructive",
  done: "bg-primary/12 text-primary",
};

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const healthTone = (health: string): Tone =>
  health === "Atrasado" ? "late" : health === "Atenção" ? "attention" : "active";
