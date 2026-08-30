import { Link, useRouterState } from "@tanstack/react-router";
import { Folder, HeartPlus, Menu, SquareCheckBig, Wallet } from "lucide-react";

const items = [
  { to: "/", label: "Hoje", icon: SquareCheckBig, match: (p: string) => p === "/" },
  {
    to: "/projetos",
    label: "Projetos",
    icon: Folder,
    match: (p: string) => p.startsWith("/projetos"),
  },
  {
    to: "/financeiro",
    label: "Financeiro",
    icon: Wallet,
    match: (p: string) => p.startsWith("/financeiro"),
  },
  {
    to: "/habitos",
    label: "Saúde",
    icon: HeartPlus,
    match: (p: string) => p.startsWith("/habitos"),
  },
  {
    to: "/mais",
    label: "Mais",
    icon: Menu,
    match: (p: string) =>
      ["/mais", "/objetivos", "/mes", "/configuracoes"].some((x) => p.startsWith(x)),
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
                  active ? "size-[22px] text-primary" : "size-[22px] text-muted-foreground"
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
