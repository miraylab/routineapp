import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ImageOff } from "lucide-react";

import { PageHeader } from "@/components/yuri/PageHeader";
import {
  fetchBodyImageEntries,
  type BodyImageEntry,
} from "@/lib/supabaseBodyProgress";
import { useAuth } from "@/lib/supabaseAuth";

export const Route = createFileRoute("/saude/imagens")({
  head: () => ({
    meta: [
      { title: "Histórico de imagens · Saúde · YURI OS" },
      {
        name: "description",
        content: "Galeria privada das imagens de acompanhamento físico.",
      },
    ],
  }),
  component: BodyImageHistoryPage,
});

function BodyImageHistoryPage() {
  const { session } = useAuth();
  const [images, setImages] = useState<BodyImageEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    setStatus("loading");

    fetchBodyImageEntries(session?.accessToken)
      .then((entries) => {
        if (!active) return;
        setImages(entries);
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [session?.accessToken]);

  return (
    <div className="space-y-3">
      <PageHeader title="Histórico de imagens" subtitle="Acompanhamento do físico" back />

      {status === "loading" ? (
        <div className="rounded-3xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
          Carregando imagens...
        </div>
      ) : status === "error" ? (
        <div className="rounded-3xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
          Não consegui carregar o histórico agora.
        </div>
      ) : images.length ? (
        <div className="grid grid-cols-2 gap-3">
          {images.map((image) => (
            <article
              key={image.id}
              className="overflow-hidden rounded-3xl border border-border/60 bg-card"
            >
              {image.imageUrl ? (
                <img
                  src={image.imageUrl}
                  alt={`Registro físico de ${formatDateTime(image.capturedAt)}`}
                  className="aspect-[3/4] w-full object-cover"
                />
              ) : (
                <div className="grid aspect-[3/4] place-items-center bg-background/60">
                  <ImageOff className="size-6 text-muted-foreground" strokeWidth={1.7} />
                </div>
              )}
              <div className="px-3 py-2 text-[11px] font-medium text-muted-foreground">
                {formatDateTime(image.capturedAt)}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
          Nenhuma imagem registrada ainda.
        </div>
      )}
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
