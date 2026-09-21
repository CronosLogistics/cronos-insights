import {
  LayoutDashboard,
  FileSpreadsheet,
  Route as RouteIcon,
  Building2,
  ChartColumn,
  Ship,
  Users,
  UserRound,
  UserSearch,
  Briefcase,
  TrendingDown,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  /** Ausente quando o item é só um grupo expansível (sem rota própria). */
  to?: string;
  icon: LucideIcon;
  description: string;
  children?: NavItem[];
  /** Visível apenas para administradores (a segurança real está no servidor). */
  adminOnly?: boolean;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

/**
 * Arquitetura de navegação derivada do modelo de análise de cotações:
 * visão geral, carteira de ofertas e as fichas de inteligência por dimensão.
 * Novos módulos (multimodal, tarifários, metas) entram como novos grupos.
 */
export const navigation: NavGroup[] = [
  {
    title: "Visão geral",
    items: [
      {
        label: "Dashboard",
        to: "/dashboard",
        icon: LayoutDashboard,
        description: "Indicadores de conversão, volume e tempo de resposta.",
      },
      {
        label: "Cotações em análise",
        to: "/cotacoes",
        icon: FileSpreadsheet,
        description: "Fila de cotações em análise, ordenada pelo maior tempo em aberto.",
      },
    ],
  },
  {
    title: "Inteligência",
    items: [
      {
        label: "Rotas",
        to: "/rotas",
        icon: RouteIcon,
        description: "Origem e destino, portos, países e alternativas de rota.",
      },
      {
        label: "Clientes",
        icon: Building2,
        description: "Comportamento de aprovação e recorrência por cliente.",
        children: [
          {
            label: "Por cliente",
            to: "/clientes_por_cliente",
            icon: UserSearch,
            description: "Ficha analítica detalhada de um cliente selecionado.",
          },
          {
            label: "Visão geral",
            to: "/clientes",
            icon: ChartColumn,
            description: "Ranking e indicadores agregados de clientes.",
          },
        ],
      },
      {
        label: "Coloaders / Armadores",
        to: "/coloaders",
        icon: Ship,
        description: "Desempenho de parceiros de transporte por rota.",
      },
      {
        label: "Agentes",
        to: "/agentes",
        icon: Users,
        description: "Inteligência de agentes: volume, conversão e cobertura.",
      },
      {
        label: "Analistas Pricing",
        to: "/analistas",
        icon: UserRound,
        description: "Ficha de inteligência do analista de Pricing.",
      },
    ],
  },
  {
    title: "Diagnóstico",
    items: [
      {
        label: "Motivos de Perda",
        to: "/motivos-perda",
        icon: TrendingDown,
        description:
          "Concentração de reprovações por motivo, rota, cliente, coloader e agente.",
      },
      {
        label: "Qualidade de Dados",
        to: "/qualidade-dados",
        icon: ShieldCheck,
        description: "Consistência da base e campos não informados.",
      },
      {
        label: "Usuários",
        to: "/usuarios",
        icon: UserCog,
        description: "Cadastro de usuários e modalidades de acesso.",
        adminOnly: true,
      },
      {
        label: "Configurações",
        to: "/configuracoes",
        icon: Settings,
        description: "Parâmetros, períodos e regras de análise.",
      },
    ],
  },
];
