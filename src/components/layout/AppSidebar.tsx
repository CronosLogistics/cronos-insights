import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, ChevronRight } from "lucide-react";
import { useState } from "react";

import { usePerfil } from "@/hooks/useProduto";
import { navigation, type NavItem } from "@/lib/navigation";
import { aplicarTerminologia, useTerminologia } from "@/lib/terminologia";
import { cn } from "@/lib/utils";

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const perfil = usePerfil();
  const isAdmin = perfil.data?.isAdmin === true;
  const grupos = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className="surface-vinho flex h-full w-72 flex-col">
      <div className="flex items-center gap-3 px-6 py-6">
        <span className="gradient-cronos flex size-10 items-center justify-center rounded-xl shadow-glow">
          <Activity className="size-5 text-primary-foreground" />
        </span>
        <span className="leading-tight">
          <span className="block font-display text-sm font-semibold tracking-tight">
            Cronos Pricing Insights
          </span>
          <span className="block text-[11px] uppercase tracking-[0.18em] opacity-65">
            Análise de Cotações
          </span>
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6 [scrollbar-color:rgba(255,255,255,0.22)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
        {grupos.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] opacity-50">
              {group.title}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.to ?? item.label}>
                  {item.children && item.children.length > 0 ? (
                    <NavGroupItem
                      item={item}
                      {...(onNavigate ? { onNavigate } : {})}
                    />
                  ) : (
                    <NavLinkItem
                      item={item}
                      {...(onNavigate ? { onNavigate } : {})}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-6 py-4 text-[11px] opacity-55">
        Base analítica multimodal · v1.3
      </div>
    </aside>
  );
}

function childAtivo(item: NavItem, pathname: string): boolean {
  return (item.children ?? []).some(
    (child) =>
      Boolean(child.to) &&
      (pathname === child.to || pathname.startsWith(`${child.to}/`)),
  );
}

function NavGroupItem({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const termos = useTerminologia();
  const ativo = childAtivo(item, pathname);
  const [abertoManual, setAbertoManual] = useState<boolean | null>(null);
  const aberto = abertoManual ?? ativo;

  return (
    <div>
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAbertoManual(!aberto)}
        className={cn(
          "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium opacity-80 transition-colors duration-200 hover:bg-sidebar-accent hover:opacity-100",
          ativo && "opacity-100",
        )}
      >
        <item.icon className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {aplicarTerminologia(item.label, termos)}
        </span>
        <ChevronRight
          className={cn(
            "size-4 shrink-0 opacity-60 transition-transform duration-300 ease-out",
            aberto && "rotate-90",
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          aberto ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <ul
            className={cn(
              "mt-1 space-y-1 border-l border-sidebar-border pl-3 ml-4 transition-opacity duration-300 ease-out",
              aberto ? "opacity-100" : "opacity-0",
            )}
          >
            {item.children?.map((child) => (
              <li key={child.to ?? child.label}>
                <NavLinkItem
                  item={child}
                  nested
                  {...(onNavigate ? { onNavigate } : {})}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function NavLinkItem({
  item,
  onNavigate,
  nested = false,
}: {
  item: NavItem;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const termos = useTerminologia();
  const termos = useTerminologia();
  if (!item.to) return null;

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 font-medium transition-colors hover:bg-sidebar-accent hover:opacity-100",
        nested
          ? "gap-2 py-2 text-[13px] opacity-70"
          : "py-2.5 text-sm opacity-80",
      )}
      activeOptions={{ exact: true }}
      activeProps={{
        className:
          "bg-sidebar-accent opacity-100 shadow-[inset-2px_0_0_0_var(--color-cronos)]",
      }}
    >
      <item.icon className={cn("shrink-0", nested ? "size-3.5" : "size-4")} />
      <span className="truncate">{aplicarTerminologia(item.label, termos)}</span>
    </Link>
  );
}
