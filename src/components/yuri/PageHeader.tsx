import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  back = false,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
}) {
  const router = useRouter();

  return (
    <header className="mb-4 flex items-start gap-3">
      {back ? (
        <button
          type="button"
          onClick={() => router.history.back()}
          className="press -ml-2 grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-elevated"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" />
        </button>
      ) : null}
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </header>
  );
}
