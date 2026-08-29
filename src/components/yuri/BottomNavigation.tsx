import { Link, useRouterState } from "@tanstack/react-router";
import { Clock, LayoutGrid, Target, Menu } from "lucide-react";

const items = [
  { to: "/", label: "Hoje", icon: Clock, match: (p: string) => p === "/" },
  {
    to: "/semana",
    label: "Semana",
    icon: Target,
    match: (p: string) => p.startsWith("/semana"),
  },
  {
    to: "/projetos",
    label: "Projetos",
    icon: LayoutGrid,
    match: (p: string) => p.startsWith("/projetos"),
  },
  {
    to: "/mais",
    label: "Mais",
    icon: Menu,
    match: (p: string) =>
      ["/mais", "/objetivos", "/habitos", "/financeiro", "/mes", "/configuracoes"].some(
        (x) => p.startsWith(x),
      ),
  },
];

export function BottomNavigation() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="safe-bottom mx-auto flex max-w-s25 items-stretch justify-between px-2 pt-1.5">
        {items.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={to}
              to={to}
              className="press flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2"
            >
              <Icon
                className={
                  active
                    ? "size-[22px] text-primary"
                    : "size-[22px] text-muted-foreground"
                }
                strokeWidth={active ? 2.2 : 1.7}
              />
              <span
                className={
                  active
                    ? "text-[10px] font-medium text-primary"
                    : "text-[10px] text-muted-foreground"
                }
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
