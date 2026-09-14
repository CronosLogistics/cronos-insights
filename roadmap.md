# Roadmap — Cronos Pricing Insights

## Concluído
- Base visual, login e layout autenticado
- Conexão com OneDrive/SharePoint (Ofertas.xlsx em BI/Base Relatórios/Ativos/Gestão)
- Tabelas `ofertas` e `importacoes` no banco
- Carga inicial: 172.804 ofertas/revisões (2023-01-02 a 2026-09-13)
- Visões analíticas no banco (KPIs gerais, evolução mensal, rotas, clientes,
  coloaders, agentes, analistas, vendedores, motivos de perda, cotações em
  aberto, qualidade de dados)
- Todas as telas com informação consomem a base de ofertas: Dashboard,
  Cotações, Rotas, Clientes, Coloaders, Agentes, Analistas, Vendedores,
  Motivos de Perda, Qualidade de Dados e histórico de cargas em Configurações

## Aberto
- Carga diária automática: bloqueada. O Ofertas.xlsx tem ~190 MB (aba
  base-ofertas com 248 mil linhas), volume que o runtime da aplicação não
  consegue abrir. Depende de decisão do usuário: exportar diariamente um
  CSV/arquivo enxuto na mesma pasta (habilita automação) ou manter atualização
  manual sob demanda.
- Filtros globais de período/modalidade nos módulos (hoje há busca por nome).
- Parâmetros e cadastros de apoio em Configurações continuam visuais.
