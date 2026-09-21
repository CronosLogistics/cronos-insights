DROP VIEW IF EXISTS public.v_kpis_geral;
CREATE VIEW public.v_kpis_geral WITH (security_invoker = true) AS
WITH p AS (SELECT public.produtos_do_usuario() AS prods),
k AS (SELECT m.* FROM analitico.mv_kpis_geral m, p WHERE m.produto = ANY (p.prods))
SELECT
  (SELECT string_agg(DISTINCT produto, '+') FROM k) AS produto,
  coalesce(sum(k.ofertas), 0)::bigint AS ofertas,
  coalesce(sum(k.aprovadas), 0)::bigint AS aprovadas,
  coalesce(sum(k.reprovadas), 0)::bigint AS reprovadas,
  coalesce(sum(k.em_aberto), 0)::bigint AS em_aberto,
  CASE WHEN coalesce(sum(k.aprovadas) + sum(k.reprovadas), 0) > 0
    THEN round(sum(k.aprovadas)::numeric * 100 / (sum(k.aprovadas) + sum(k.reprovadas)), 1)
    ELSE 0 END AS conversao_pct,
  CASE WHEN coalesce(sum(k.ofertas), 0) > 0
    THEN round(sum(k.tempo_medio_horas * k.ofertas)::numeric / sum(k.ofertas), 1)
    ELSE 0 END AS tempo_medio_horas,
  (SELECT count(DISTINCT m.rota) FROM analitico.mv_rotas m, p WHERE m.produto = ANY (p.prods))::bigint AS rotas,
  (SELECT count(DISTINCT m.cliente) FROM analitico.mv_clientes m, p WHERE m.produto = ANY (p.prods))::bigint AS clientes,
  (SELECT count(DISTINCT m.coloader) FROM analitico.mv_coloaders m, p WHERE m.produto = ANY (p.prods))::bigint AS coloaders,
  (SELECT count(DISTINCT m.agente) FROM analitico.mv_agentes m, p WHERE m.produto = ANY (p.prods))::bigint AS agentes,
  (SELECT count(DISTINCT m.vendedor) FROM analitico.mv_vendedores m, p WHERE m.produto = ANY (p.prods))::bigint AS vendedores,
  (SELECT count(DISTINCT m.analista) FROM analitico.mv_analistas m, p WHERE m.produto = ANY (p.prods))::bigint AS analistas,
  coalesce(sum(k.teus), 0)::numeric AS teus,
  min(k.primeira_abertura) AS primeira_abertura,
  max(k.ultima_abertura) AS ultima_abertura
FROM k;
GRANT SELECT ON public.v_kpis_geral TO authenticated;

DROP VIEW IF EXISTS public.v_ofertas_mensal;
CREATE VIEW public.v_ofertas_mensal WITH (security_invoker = true) AS
SELECT string_agg(DISTINCT m.produto, '+') AS produto, m.mes_ano, m.ano, m.mes,
  sum(m.ofertas)::bigint AS ofertas, sum(m.aprovadas)::bigint AS aprovadas,
  sum(m.reprovadas)::bigint AS reprovadas, sum(m.em_aberto)::bigint AS em_aberto,
  CASE WHEN (sum(m.aprovadas) + sum(m.reprovadas)) > 0
    THEN round(sum(m.aprovadas)::numeric * 100 / (sum(m.aprovadas) + sum(m.reprovadas)), 1) ELSE 0 END AS conversao_pct
FROM analitico.mv_ofertas_mensal m
WHERE m.produto = ANY (public.produtos_do_usuario())
GROUP BY m.mes_ano, m.ano, m.mes;
GRANT SELECT ON public.v_ofertas_mensal TO authenticated;

DROP VIEW IF EXISTS public.v_clientes;
CREATE VIEW public.v_clientes WITH (security_invoker = true) AS
SELECT string_agg(DISTINCT m.produto, '+') AS produto, m.cliente,
  sum(m.ofertas)::bigint AS ofertas, sum(m.aprovadas)::bigint AS aprovadas,
  sum(m.reprovadas)::bigint AS reprovadas, sum(m.em_aberto)::bigint AS em_aberto,
  CASE WHEN (sum(m.aprovadas) + sum(m.reprovadas)) > 0
    THEN round(sum(m.aprovadas)::numeric * 100 / (sum(m.aprovadas) + sum(m.reprovadas)), 1) ELSE 0 END AS conversao_pct,
  sum(m.rotas)::bigint AS rotas, max(m.ultima_oferta) AS ultima_oferta
FROM analitico.mv_clientes m
WHERE m.produto = ANY (public.produtos_do_usuario())
GROUP BY m.cliente;
GRANT SELECT ON public.v_clientes TO authenticated;

DROP VIEW IF EXISTS public.v_rotas;
CREATE VIEW public.v_rotas WITH (security_invoker = true) AS
SELECT string_agg(DISTINCT m.produto, '+') AS produto, m.rota, m.origem, m.destino,
  m.pais_origem, m.pais_destino, m.modalidade,
  sum(m.ofertas)::bigint AS ofertas, sum(m.aprovadas)::bigint AS aprovadas,
  sum(m.reprovadas)::bigint AS reprovadas, sum(m.em_aberto)::bigint AS em_aberto,
  CASE WHEN (sum(m.aprovadas) + sum(m.reprovadas)) > 0
    THEN round(sum(m.aprovadas)::numeric * 100 / (sum(m.aprovadas) + sum(m.reprovadas)), 1) ELSE 0 END AS conversao_pct,
  sum(m.clientes)::bigint AS clientes, sum(m.teus)::numeric AS teus
FROM analitico.mv_rotas m
WHERE m.produto = ANY (public.produtos_do_usuario())
GROUP BY m.rota, m.origem, m.destino, m.pais_origem, m.pais_destino, m.modalidade;
GRANT SELECT ON public.v_rotas TO authenticated;

DROP VIEW IF EXISTS public.v_coloaders;
CREATE VIEW public.v_coloaders WITH (security_invoker = true) AS
SELECT string_agg(DISTINCT m.produto, '+') AS produto, m.coloader,
  sum(m.ofertas)::bigint AS ofertas, sum(m.aprovadas)::bigint AS aprovadas,
  sum(m.reprovadas)::bigint AS reprovadas,
  CASE WHEN (sum(m.aprovadas) + sum(m.reprovadas)) > 0
    THEN round(sum(m.aprovadas)::numeric * 100 / (sum(m.aprovadas) + sum(m.reprovadas)), 1) ELSE 0 END AS conversao_pct,
  sum(m.rotas)::bigint AS rotas, sum(m.teus)::numeric AS teus
FROM analitico.mv_coloaders m
WHERE m.produto = ANY (public.produtos_do_usuario())
GROUP BY m.coloader;
GRANT SELECT ON public.v_coloaders TO authenticated;

DROP VIEW IF EXISTS public.v_agentes;
CREATE VIEW public.v_agentes WITH (security_invoker = true) AS
SELECT string_agg(DISTINCT m.produto, '+') AS produto, m.agente,
  sum(m.ofertas)::bigint AS ofertas, sum(m.aprovadas)::bigint AS aprovadas,
  sum(m.reprovadas)::bigint AS reprovadas,
  CASE WHEN (sum(m.aprovadas) + sum(m.reprovadas)) > 0
    THEN round(sum(m.aprovadas)::numeric * 100 / (sum(m.aprovadas) + sum(m.reprovadas)), 1) ELSE 0 END AS conversao_pct,
  sum(m.origens)::bigint AS origens, sum(m.clientes)::bigint AS clientes
FROM analitico.mv_agentes m
WHERE m.produto = ANY (public.produtos_do_usuario())
GROUP BY m.agente;
GRANT SELECT ON public.v_agentes TO authenticated;

DROP VIEW IF EXISTS public.v_analistas;
CREATE VIEW public.v_analistas WITH (security_invoker = true) AS
SELECT string_agg(DISTINCT m.produto, '+') AS produto, m.analista,
  sum(m.ofertas)::bigint AS ofertas, sum(m.decididas)::bigint AS decididas,
  sum(m.em_aberto)::bigint AS em_aberto, sum(m.aprovadas)::bigint AS aprovadas,
  CASE WHEN sum(m.decididas) > 0
    THEN round(sum(m.aprovadas)::numeric * 100 / sum(m.decididas), 1) ELSE 0 END AS conversao_pct,
  CASE WHEN sum(m.ofertas) > 0
    THEN round(sum(m.tempo_medio_horas * m.ofertas)::numeric / sum(m.ofertas), 1) ELSE 0 END AS tempo_medio_horas
FROM analitico.mv_analistas m
WHERE m.produto = ANY (public.produtos_do_usuario())
GROUP BY m.analista;
GRANT SELECT ON public.v_analistas TO authenticated;

DROP VIEW IF EXISTS public.v_vendedores;
CREATE VIEW public.v_vendedores WITH (security_invoker = true) AS
SELECT string_agg(DISTINCT m.produto, '+') AS produto, m.vendedor,
  sum(m.ofertas)::bigint AS ofertas, sum(m.aprovadas)::bigint AS aprovadas,
  sum(m.reprovadas)::bigint AS reprovadas,
  CASE WHEN (sum(m.aprovadas) + sum(m.reprovadas)) > 0
    THEN round(sum(m.aprovadas)::numeric * 100 / (sum(m.aprovadas) + sum(m.reprovadas)), 1) ELSE 0 END AS conversao_pct,
  sum(m.clientes)::bigint AS clientes, sum(m.rotas)::bigint AS rotas
FROM analitico.mv_vendedores m
WHERE m.produto = ANY (public.produtos_do_usuario())
GROUP BY m.vendedor;
GRANT SELECT ON public.v_vendedores TO authenticated;

DROP VIEW IF EXISTS public.v_motivos_perda;
CREATE VIEW public.v_motivos_perda WITH (security_invoker = true) AS
WITH p AS (SELECT public.produtos_do_usuario() AS prods),
m AS (SELECT x.* FROM analitico.mv_motivos_perda x, p WHERE x.produto = ANY (p.prods)),
t AS (SELECT sum(reprovacoes) AS total FROM m)
SELECT string_agg(DISTINCT m.produto, '+') AS produto, m.motivo,
  sum(m.reprovacoes)::bigint AS reprovacoes,
  CASE WHEN (SELECT total FROM t) > 0
    THEN round(sum(m.reprovacoes)::numeric * 100 / (SELECT total FROM t), 1) ELSE 0 END AS participacao_pct,
  (array_agg(m.cliente_recorrente ORDER BY m.reprovacoes DESC))[1] AS cliente_recorrente,
  (array_agg(m.rota_recorrente ORDER BY m.reprovacoes DESC))[1] AS rota_recorrente
FROM m
GROUP BY m.motivo;
GRANT SELECT ON public.v_motivos_perda TO authenticated;

DROP VIEW IF EXISTS public.v_qualidade_dados;
CREATE VIEW public.v_qualidade_dados WITH (security_invoker = true) AS
SELECT string_agg(DISTINCT m.produto, '+') AS produto, m.campo,
  sum(m.preenchidos)::bigint AS preenchidos, sum(m.vazios)::bigint AS vazios,
  CASE WHEN (sum(m.preenchidos) + sum(m.vazios)) > 0
    THEN round(sum(m.preenchidos)::numeric * 100 / (sum(m.preenchidos) + sum(m.vazios)), 1) ELSE 0 END AS preenchimento_pct
FROM analitico.mv_qualidade_dados m
WHERE m.produto = ANY (public.produtos_do_usuario())
GROUP BY m.campo;
GRANT SELECT ON public.v_qualidade_dados TO authenticated;

DROP VIEW IF EXISTS public.v_cliente_lista;
CREATE VIEW public.v_cliente_lista WITH (security_invoker = true) AS
SELECT m.cliente, sum(m.ofertas)::bigint AS ofertas
FROM analitico.mv_cliente_lista m
WHERE m.produto = ANY (public.produtos_do_usuario())
GROUP BY m.cliente;
GRANT SELECT ON public.v_cliente_lista TO authenticated;

DROP VIEW IF EXISTS public.v_cliente_media_geral;
CREATE VIEW public.v_cliente_media_geral WITH (security_invoker = true) AS
SELECT coalesce(sum(m.aprovadas), 0)::bigint AS aprovadas, coalesce(sum(m.reprovadas), 0)::bigint AS reprovadas
FROM analitico.mv_cliente_media_geral m
WHERE m.produto = ANY (public.produtos_do_usuario());
GRANT SELECT ON public.v_cliente_media_geral TO authenticated;