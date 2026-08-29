import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Compass,
  HeartPulse,
  Wallet,
  CalendarRange,
  Settings,
} from "lucide-react";

import { PageHeader } from "@/components/yuri/PageHeader";

const links = [
  {
    to: "/objetivos" as const,
    label: "Objetivos",
    desc: "Longo prazo e trimestre",
    icon: Compass,
  },
  {
    to: "/habitos" as const,
    label: "Hábitos / Saúde",
    desc: "Semana atual",
    icon: HeartPulse,
  },
  {
    to: "/financeiro" as const,
    label: "Financeiro",
    desc: "Visão gerencial do mês",
    icon: Wallet,
  },
  {
    to: "/mes" as const,
    label: "Visão mensal",
    desc: "Progresso por área",
    icon: CalendarRange,
  },
  {
    to: "/configuracoes" as const,
    label: "Configurações",
    desc: "Preferências e demonstração",
    icon: Settings,
  },
];

export const Route = createFileRoute("/mais/")({
  head: () => ({
    meta: [
      { title: "Mais · YURI OS" },
      {
        name: "description",
        content:
          "Acesse objetivos, hábitos e saúde, financeiro, visão mensal e configurações do YURI OS.",
      },
      { property: "og:title", content: "Mais · YURI OS" },
      {
        property: "og:description",
        content: "Objetivos, hábitos, financeiro, visão mensal e configurações.",
      },
    ],
  }),
  component: MaisPage,
});

function MaisPage() {
  return (
    <div>
      <PageHeader title="Mais" subtitle="Outras dimensões do sistema" />
      <div className="space-y-2">
        {links.map(({ to, label, desc, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="press flex items-center gap-4 rounded-3xl border border-border/60 bg-card px-5 py-4"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-elevated/60 text-primary">
              <Icon className="size-5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">
                {label}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {desc}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
