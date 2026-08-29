import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, ResponsiveContainer, XAxis } from "recharts";

import { FinanceSummary } from "@/components/yuri/FinanceSummary";
import { PageHeader } from "@/components/yuri/PageHeader";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro · YURI OS" },
      {
        name: "description",
        content:
          "Visão gerencial do mês: receita, gastos, investimentos, disponível e taxa de poupança.",
      },
      { property: "og:title", content: "Financeiro · YURI OS" },
      {
        property: "og:description",
        content: "Receita, gastos, investimentos e taxa de poupança do mês.",
      },
    ],
  }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const { finance, financeHistory } = useStore();

  return (
    <div className="space-y-4">
      <PageHeader title="Financeiro" subtitle="Visão gerencial" back />

      <FinanceSummary data={finance} />

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
          EVOLUÇÃO · VALOR INVESTIDO
        </p>
        <div className="mt-4 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={financeHistory}
              margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="saved" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              />
              <Area
                type="monotone"
                dataKey="saved"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#saved)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
