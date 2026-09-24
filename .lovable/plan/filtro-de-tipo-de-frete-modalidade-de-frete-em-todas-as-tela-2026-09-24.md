# Filtro de tipo de frete (Modalidade de frete) em todas as telas

## O que o usuário verá
- Novo filtro "Tipo de frete" em Dashboard, Rotas, Clientes (Por cliente), Coloaders, Agentes, Analistas, Motivos de Perda e Qualidade dos Dados, ao lado dos filtros de ano/mês.
- As opções vêm da base e só incluem os tipos existentes nas modalidades do perfil:
  - Aérea (IA/EA): Back to Back, Consolidada, Master Direto, Escalonado, Embarque Triangular, Transhipment.
  - Marítima (IM/EM): FCL, LCL, Break Bulk, FTL, LTL, OOG.
  - Perfil misto vê a união do que existe nas suas modalidades.
- Registros sem tipo aparecem como "Não informado".
- Padrão "Todos" = comportamento atual (mesma velocidade de hoje).

## Segurança
- Opções e resultados calculados no banco, sempre com `produto = ANY(produtos_do_usuario())`. Um usuário aéreo que envie "LCL" pela URL/API recebe resultado vazio (não há dados LCL nas suas modalidades).

## Technical details
- Nova coluna derivada `modalidade_f` (coalesce/trim → 'Não informado') em `mv_ofertas_periodo` e nas bases por tela.
- Nova RPC `modalidades_frete_opcoes()` lendo matview pequena `mv_modalidade_frete_opcoes (produto, modalidade_f)`.
- Cada RPC de análise ganha parâmetro opcional `p_modalidade text default 'Todos'` (overload compatível):
  - `Todos` → caminho pré-calculado atual inalterado.
  - Valor específico → caminho filtrado; as matviews `mv_*_per_*` recebem `modalidade_f` na chave de agrupamento e índices `(produto, modalidade_f, ano_f, mes_f, ...)`, para não voltar aos timeouts.
- Dashboard: adicionar `p_modalidade` a `dashboard_analise` (caminho filtrado já existe) e `modalidades` em `dashboard_opcoes_filtro`.
- `atualizar_analises*()` refresca as novas matviews.
- Frontend: componente compartilhado `FiltroModalidadeFrete` (padrão visual do `FiltroPeriodo`), valor incluído no queryKey e enviado às server functions (`*-analysis-fn.ts`), validado no servidor.
- Execução por tela, validando cada uma com Playwright (sessão aérea e marítima) antes de seguir para a próxima.

## Risco
- Recriar matviews de período aumenta tamanho/tempo de atualização da base (estimativa: +20–40%). Primeira consulta com tipo de frete após atualização pode levar alguns segundos.
