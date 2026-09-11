import { createFileRoute } from "@tanstack/react-router";

import { ModuleIntro, PanelBlock } from "@/components/data/Placeholders";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Parâmetros da análise de Pricing: períodos, regras de decisão, cadastros de apoio e acessos.",
      },
      { property: "og:title", content: "Configurações — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Parâmetros e cadastros de apoio da plataforma de Pricing.",
      },
    ],
  }),
  component: ConfiguracoesPage,
});

const groups = [
  {
    title: "Parâmetros de análise",
    description: "Período padrão, mínimo de decisões por dimensão e faixas de atenção.",
    rows: ["Período padrão", "Mínimo de decisões", "Faixas de atenção"],
  },
  {
    title: "Cadastros de apoio",
    description: "De/para de portos, agrupamento de clientes e normalização de coloaders.",
    rows: ["De/para de portos", "Agrupamento de clientes", "Normalização de coloaders"],
  },
  {
    title: "Cargas e histórico",
    description: "Origem dos arquivos, controle de importação e base histórica.",
    rows: ["Importações", "Controle de histórico", "Retenção"],
  },
  {
    title: "Acessos",
    description: "Perfis de Pricing, comercial e gestão. Papéis serão implementados na sequência.",
    rows: ["Usuários", "Perfis", "Permissões"],
  },
];

function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <ModuleIntro
        eyebrow="Administração"
        title="Configurações"
        description="Área reservada para os parâmetros que sustentam a análise de Pricing. Nesta etapa apenas a estrutura visual está definida."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <PanelBlock
            key={group.title}
            title={group.title}
            description={group.description}
            action={<Badge variant="secondary">Em construção</Badge>}
          >
            <div className="space-y-3">
              {group.rows.map((row, index) => (
                <div key={row}>
                  {index > 0 ? <Separator className="mb-3" /> : null}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{row}</span>
                    <Skeleton className="h-8 w-28 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </PanelBlock>
        ))}
      </div>
    </div>
  );
}
