import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";

import { navigation } from "@/lib/navigation";

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
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

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {navigation.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] opacity-50">
              {group.title}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium opacity-80 transition-colors hover:bg-sidebar-accent hover:opacity-100"
                    activeOptions={{ exact: true }}
                    activeProps={{
                      className:
                        "bg-sidebar-accent opacity-100 shadow-[inset_2px_0_0_0_var(--color-cronos)]",
                    }}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>

                  {item.children && item.children.length > 0 ? (
                    <ul className="mt-1 space-y-1 border-l border-sidebar-border pl-3 ml-4">
                      {item.children.map((child) => (
                        <li key={child.to}>
                          <Link
                            to={child.to}
                            onClick={onNavigate}
                            className="group flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium opacity-70 transition-colors hover:bg-sidebar-accent hover:opacity-100"
                            activeProps={{
                              className:
                                "bg-sidebar-accent opacity-100 shadow-[inset_2px_0_0_0_var(--color-cronos)]",
                            }}
                          >
                            <child.icon className="size-3.5 shrink-0" />
                            <span className="truncate">{child.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
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
