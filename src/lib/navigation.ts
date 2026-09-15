import {
  LayoutDashboard,
  FileSpreadsheet,
  Route as RouteIcon,
  Building2,
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
  to: string;
  icon: LucideIcon;
  description: string;
  children?: NavItem[];
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
        label: "Cotações",
        to: "/cotacoes",
        icon: FileSpreadsheet,
        description: "Carteira de ofertas, revisões e cotações em análise.",
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
        to: "/clientes",
        icon: Building2,
        description: "Comportamento de aprovação e recorrência por cliente.",
        children: [
          {
            label: "Por cliente",
            to: "/clientes_por_cliente",
            icon: UserSearch,
            description: "Ficha analítica detalhada de um cliente selecionado.",
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
        description: "Participação e efetividade dos agentes no exterior.",
      },
    ],
  },
  {
    title: "Pessoas",
    items: [
      {
        label: "Analistas de Pricing",
        to: "/analistas",
        icon: UserRound,
        description: "Produtividade e taxa de decisão por analista.",
      },
      {
        label: "Vendedores",
        to: "/vendedores",
        icon: Briefcase,
        description: "Conversão comercial e carteira por vendedor.",
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
        description: "Reprovações por motivo, cliente e rota.",
      },
      {
        label: "Qualidade de Dados",
        to: "/qualidade-dados",
        icon: ShieldCheck,
        description: "Consistência da base e campos não informados.",
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
