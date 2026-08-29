import { ProgressBar } from "./ProgressBar";
import type { FinanceMonth } from "@/data/mockData";

export const brl = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

export function FinanceSummary({ data }: { data: FinanceMonth }) {
  const savingsRate =
    data.income > 0 ? (data.investments / data.income) * 100 : 0;
  const expenses = data.fixedExpenses + data.variableExpenses + data.leisure;

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
          {data.month.toUpperCase()}
        </p>
        <p className="tabular mt-3 text-3xl font-semibold tracking-tight">
          {brl(data.income)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Receita do mês</p>

        <div className="tabular mt-5 grid grid-cols-2 gap-3">
          <Cell label="Gastos" value={brl(expenses)} />
          <Cell label="Investido" value={brl(data.investments)} />
          <Cell label="Disponível" value={brl(data.available)} />
          <Cell
            label="Taxa de poupança"
            value={`${savingsRate.toFixed(1).replace(".", ",")}%`}
            accent
          />
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
          ORÇAMENTO
        </p>
        <div className="mt-4 space-y-4">
          <Budget label="Fixos" value={data.fixedExpenses} />
          <Budget
            label="Variáveis"
            value={data.variableExpenses}
            budget={data.variableBudget}
          />
          <Budget
            label="Lazer"
            value={data.leisure}
            budget={data.leisureBudget}
          />
        </div>
      </section>
    </div>
  );
}

function Cell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-elevated/50 px-4 py-3">
      <p
        className={
          accent
            ? "text-lg font-semibold text-primary"
            : "text-lg font-semibold"
        }
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Budget({
  label,
  value,
  budget,
}: {
  label: string;
  value: number;
  budget?: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="tabular text-muted-foreground">
          {brl(value)}
          {budget ? ` / ${brl(budget)}` : ""}
        </span>
      </div>
      {budget ? (
        <ProgressBar value={(value / budget) * 100} className="mt-2" />
      ) : null}
    </div>
  );
}
