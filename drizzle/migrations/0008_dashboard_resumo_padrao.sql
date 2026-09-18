CREATE MATERIALIZED VIEW analitico.mv_dashboard_resumo AS
WITH
base AS (
  SELECT * FROM analitico.mv_dashboard_base
),
alt AS (
  SELECT produto,
         count(*)::int AS total,
         sum(apr)::int AS apr,
         sum(rep)::int AS rep,
         sum(ema)::int AS ema,
         count(DISTINCT cliente)::int AS clientes,
         count(DISTINCT rota)::int AS rotas,
         count(DISTINCT coloader)::int AS coloaders,
         min(data_abertura)::date AS data_inicial,
         max(data_abertura)::date AS data_final
  FROM base
  GROUP BY produto
),
ofu AS (
  SELECT produto,
         count(DISTINCT oferta)::int AS total,
         count(DISTINCT oferta) FILTER (WHERE apr = 1)::int AS apr,
         count(DISTINCT oferta) FILTER (WHERE rep = 1)::int AS rep,
         count(DISTINCT oferta) FILTER (WHERE ema = 1)::int AS ema
  FROM base
  GROUP BY produto
),
por_mes AS (
  SELECT produto, mes, count(*)::int AS rotas, sum(apr)::int AS apr, sum(rep)::int AS rep
  FROM base
  WHERE mes IS NOT NULL
  GROUP BY produto, mes
),
mes_json AS (
  SELECT produto,
         jsonb_agg(
           jsonb_build_object(
             'mes', mes,
             'rotas', rotas,
             'aprovadas', apr,
             'reprovadas', rep,
             'conversao', CASE WHEN apr + rep > 0 THEN apr::numeric / (apr + rep) ELSE 0 END
           ) ORDER BY mes
         ) AS dados
  FROM por_mes
  GROUP BY produto
),
por_rota AS (
  SELECT produto, rota, count(*)::int AS vol, sum(apr)::int AS apr, sum(rep)::int AS rep
  FROM base
  GROUP BY produto, rota
),
por_cliente AS (
  SELECT produto, cliente, count(*)::int AS vol, sum(apr)::int AS apr, sum(rep)::int AS rep
  FROM base
  GROUP BY produto, cliente
),
por_combo AS (
  SELECT produto, rota, coloader, count(*)::int AS vol, sum(apr)::int AS apr, sum(rep)::int AS rep
  FROM base
  GROUP BY produto, rota, coloader
),
rota_baixo AS (
  SELECT produto, rota, vol, apr, rep,
         row_number() OVER (PARTITION BY produto ORDER BY vol DESC, apr::numeric / NULLIF(apr + rep, 0), rota) AS pos
  FROM por_rota r
  WHERE apr + rep >= 5
    AND apr::numeric / NULLIF(apr + rep, 0) < (
      SELECT a.apr::numeric / NULLIF(a.apr + a.rep, 0) FROM alt a WHERE a.produto = r.produto
    )
),
cliente_baixo AS (
  SELECT produto, cliente, vol, apr, rep,
         row_number() OVER (PARTITION BY produto ORDER BY vol DESC, apr::numeric / NULLIF(apr + rep, 0), cliente) AS pos
  FROM por_cliente c
  WHERE apr + rep >= 5
    AND apr::numeric / NULLIF(apr + rep, 0) < (
      SELECT a.apr::numeric / NULLIF(a.apr + a.rep, 0) FROM alt a WHERE a.produto = c.produto
    )
),
melhor_combo AS (
  SELECT produto, rota, coloader, apr, rep,
         row_number() OVER (
           PARTITION BY produto
           ORDER BY apr::numeric / NULLIF(apr + rep, 0) DESC, apr + rep DESC, rota, coloader
         ) AS pos
  FROM por_combo
  WHERE apr + rep >= 5
),
motivo_contagem AS (
  SELECT produto, motivo, count(*)::int AS rep
  FROM base
  WHERE rep = 1
  GROUP BY produto, motivo
),
motivo_top AS (
  SELECT produto, motivo, rep,
         row_number() OVER (PARTITION BY produto ORDER BY rep DESC, motivo) AS pos
  FROM motivo_contagem
),
rota_top AS (
  SELECT produto, rota, vol,
         row_number() OVER (PARTITION BY produto ORDER BY vol DESC, rota) AS pos
  FROM por_rota
),
concentracao AS (
  SELECT r.produto, r.rota, c.coloader, r.vol AS volume_rota, c.vol AS volume_combo,
         row_number() OVER (PARTITION BY r.produto ORDER BY c.vol DESC, c.coloader) AS pos
  FROM rota_top r
  JOIN por_combo c ON c.produto = r.produto AND c.rota = r.rota
  WHERE r.pos = 1
)
SELECT
  a.produto,
  a.data_inicial,
  a.data_final,
  jsonb_build_object(
    'alternativas', jsonb_build_object(
      'total', a.total,
      'aprovadas', a.apr,
      'reprovadas', a.rep,
      'em_analise', a.ema,
      'taxa_aprovacao', CASE WHEN a.apr + a.rep > 0 THEN a.apr::numeric / (a.apr + a.rep) ELSE 0 END,
      'taxa_reprovacao', CASE WHEN a.apr + a.rep > 0 THEN a.rep::numeric / (a.apr + a.rep) ELSE 0 END,
      'clientes', a.clientes,
      'rotas', a.rotas,
      'coloaders', a.coloaders
    ),
    'ofertas_unicas', jsonb_build_object(
      'total', o.total,
      'aprovadas', o.apr,
      'reprovadas', o.rep,
      'em_analise', o.ema,
      'taxa_aprovacao', CASE WHEN o.apr + o.rep > 0 THEN o.apr::numeric / (o.apr + o.rep) ELSE 0 END,
      'taxa_reprovacao', CASE WHEN o.apr + o.rep > 0 THEN o.rep::numeric / (o.apr + o.rep) ELSE 0 END
    ),
    'evolucao_mensal', COALESCE(m.dados, '[]'::jsonb),
    'oportunidades', jsonb_build_object(
      'rota_baixo', CASE WHEN rb.rota IS NULL THEN NULL ELSE jsonb_build_object(
        'item', rb.rota, 'volume', rb.vol, 'conversao', rb.apr::numeric / NULLIF(rb.apr + rb.rep, 0)) END,
      'cliente_baixo', CASE WHEN cb.cliente IS NULL THEN NULL ELSE jsonb_build_object(
        'item', cb.cliente, 'volume', cb.vol, 'conversao', cb.apr::numeric / NULLIF(cb.apr + cb.rep, 0)) END,
      'melhor_rota_coloader', CASE WHEN mc.rota IS NULL THEN NULL ELSE jsonb_build_object(
        'rota', mc.rota, 'coloader', mc.coloader,
        'conversao', mc.apr::numeric / NULLIF(mc.apr + mc.rep, 0), 'decisoes', mc.apr + mc.rep) END,
      'motivo_recorrente', CASE WHEN mt.motivo IS NULL THEN NULL ELSE jsonb_build_object(
        'motivo', mt.motivo, 'reprovacoes', mt.rep,
        'pct', CASE WHEN a.rep > 0 THEN mt.rep::numeric / a.rep ELSE 0 END) END,
      'concentracao', CASE WHEN cn.rota IS NULL THEN NULL ELSE jsonb_build_object(
        'rota', cn.rota, 'coloader', cn.coloader,
        'concentracao', cn.volume_combo::numeric / NULLIF(cn.volume_rota, 0),
        'volume_rota', cn.volume_rota) END
    )
  ) AS payload
FROM alt a
JOIN ofu o ON o.produto = a.produto
LEFT JOIN mes_json m ON m.produto = a.produto
LEFT JOIN rota_baixo rb ON rb.produto = a.produto AND rb.pos = 1
LEFT JOIN cliente_baixo cb ON cb.produto = a.produto AND cb.pos = 1
LEFT JOIN melhor_combo mc ON mc.produto = a.produto AND mc.pos = 1
LEFT JOIN motivo_top mt ON mt.produto = a.produto AND mt.pos = 1
LEFT JOIN concentracao cn ON cn.produto = a.produto AND cn.pos = 1;

CREATE UNIQUE INDEX mv_dashboard_resumo_produto_idx
  ON analitico.mv_dashboard_resumo (produto);

REVOKE ALL ON analitico.mv_dashboard_resumo FROM PUBLIC, anon, authenticated;
GRANT ALL ON analitico.mv_dashboard_resumo TO service_role;

ALTER FUNCTION public.dashboard_analise(date, date, text, text, text, text, text, text, text, text, text, integer)
  RENAME TO dashboard_analise_filtrada;

REVOKE ALL ON FUNCTION public.dashboard_analise_filtrada(date, date, text, text, text, text, text, text, text, text, text, integer)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_analise(
  p_data_inicial date DEFAULT NULL,
  p_data_final date DEFAULT NULL,
  p_analista text DEFAULT 'Todos',
  p_vendedor text DEFAULT 'Todos',
  p_cliente text DEFAULT 'Todos',
  p_origem text DEFAULT 'Todos',
  p_destino text DEFAULT 'Todos',
  p_rota text DEFAULT 'Todos',
  p_coloader text DEFAULT 'Todos',
  p_resultado text DEFAULT 'Todos',
  p_motivo text DEFAULT 'Todos',
  p_min_decisoes integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, analitico
AS $$
DECLARE
  v_produto text;
  v_resumo analitico.mv_dashboard_resumo%ROWTYPE;
BEGIN
  v_produto := public.produto_do_usuario();

  IF coalesce(p_analista, 'Todos') = 'Todos'
     AND coalesce(p_vendedor, 'Todos') = 'Todos'
     AND coalesce(p_cliente, 'Todos') = 'Todos'
     AND coalesce(p_origem, 'Todos') = 'Todos'
     AND coalesce(p_destino, 'Todos') = 'Todos'
     AND coalesce(p_rota, 'Todos') = 'Todos'
     AND coalesce(p_coloader, 'Todos') = 'Todos'
     AND coalesce(p_resultado, 'Todos') = 'Todos'
     AND coalesce(p_motivo, 'Todos') = 'Todos' THEN
    SELECT * INTO v_resumo
    FROM analitico.mv_dashboard_resumo
    WHERE produto = v_produto;

    IF FOUND
       AND (p_data_inicial IS NULL OR p_data_inicial <= v_resumo.data_inicial)
       AND (p_data_final IS NULL OR p_data_final >= v_resumo.data_final) THEN
      RETURN v_resumo.payload;
    END IF;
  END IF;

  RETURN public.dashboard_analise_filtrada(
    p_data_inicial, p_data_final, p_analista, p_vendedor, p_cliente,
    p_origem, p_destino, p_rota, p_coloader, p_resultado, p_motivo,
    p_min_decisoes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_analise(date, date, text, text, text, text, text, text, text, text, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_analise(date, date, text, text, text, text, text, text, text, text, text, integer)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.atualizar_analises()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'analitico'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW analitico.mv_kpis_geral;
  REFRESH MATERIALIZED VIEW analitico.mv_ofertas_mensal;
  REFRESH MATERIALIZED VIEW analitico.mv_rotas;
  REFRESH MATERIALIZED VIEW analitico.mv_clientes;
  REFRESH MATERIALIZED VIEW analitico.mv_coloaders;
  REFRESH MATERIALIZED VIEW analitico.mv_agentes;
  REFRESH MATERIALIZED VIEW analitico.mv_analistas;
  REFRESH MATERIALIZED VIEW analitico.mv_vendedores;
  REFRESH MATERIALIZED VIEW analitico.mv_motivos_perda;
  REFRESH MATERIALIZED VIEW analitico.mv_qualidade_dados;
  REFRESH MATERIALIZED VIEW analitico.mv_qualidade_resumo;
  REFRESH MATERIALIZED VIEW analitico.mv_cliente_lista;
  REFRESH MATERIALIZED VIEW analitico.mv_cliente_media_geral;
  REFRESH MATERIALIZED VIEW analitico.mv_dashboard_base;
  REFRESH MATERIALIZED VIEW analitico.mv_dashboard_resumo;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_ind;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_cliente;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_rota;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_coloader;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_agente;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_motivo;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_rota_agente;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_ind;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_rota;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_cliente;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_coloader;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_agente;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_rota_cliente;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_mes;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.atualizar_analises() FROM PUBLIC, anon, authenticated;