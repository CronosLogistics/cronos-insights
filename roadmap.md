# Roadmap — Cronos Pricing Insights

## Concluído
- Base visual, login e layout autenticado
- Conexão com OneDrive/SharePoint (Ofertas.xlsx em BI/Base Relatórios/Ativos/Gestão)
- Tabelas `ofertas` e `importacoes` no banco
- Carga inicial: 172.804 ofertas/revisões (2023-01-02 a 2026-09-13)
- Tela de Cotações com dados reais (KPIs, filtros, tabela)

## Aberto
- Carga diária automática: bloqueada. O Ofertas.xlsx tem ~180 MB (aba
  base-ofertas com 248 mil linhas), volume que o runtime da aplicação não
  consegue abrir. Depende de decisão do usuário: exportar diariamente um
  CSV/arquivo enxuto na mesma pasta (habilita automação) ou manter atualização
  manual sob demanda.
- Dashboard e demais módulos com dados reais (hoje placeholders).
