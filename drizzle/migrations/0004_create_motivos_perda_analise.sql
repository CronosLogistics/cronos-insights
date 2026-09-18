CREATE OR REPLACE VIEW analitico.v_base_motivo AS
SELECT
  o.produto,
  COALESCE(NULLIF(btrim(o.motivo), ''), '(Não informado)') AS motivo,
  COALESCE(NULLIF(btrim(o.cliente), ''), '(Não informado)') AS cliente,
  (COALESCE(NULLIF(btrim(o.origem), ''), 'Não informado') || ' → ') || COALESCE(NULLIF(btrim(o.destino), ''), 'Não informado') AS rota,
  COALESCE(NULLIF(btrim(o.armador), ''), '(Não informado)') AS coloader,
  COALESCE(NULLIF(btrim(o.agente), ''), '(Não informado)') AS agente,
  date_trunc('month', o.data_abertura)::date AS mes
FROM public.ofertas o
WHERE o.produto IS NOT NULL AND o.analise = 'Reprovado';

CREATE MATERIALIZED VIEW analitico.mv_motivo_ind AS
SELECT produto,
  CASE WHEN GROUPING(motivo) = 1 THEN 'Todos' ELSE motivo END AS motivo,
  count(*) AS reprovacoes,
  count(DISTINCT rota) AS rotas,
  count(DISTINCT cliente) AS clientes,
  count(DISTINCT coloader) AS coloaders,
  count(DISTINCT agente) AS agentes,
  count(DISTINCT mes) AS meses
FROM analitico.v_base_motivo
GROUP BY GROUPING SETS ((produto, motivo), (produto));

CREATE UNIQUE INDEX mv_motivo_ind_pk ON analitico.mv_motivo_ind (produto, motivo);

CREATE MATERIALIZED VIEW analitico.mv_motivo_rota AS
SELECT produto, CASE WHEN GROUPING(motivo) = 1 THEN 'Todos' ELSE motivo END AS motivo,
  rota AS item, count(*) AS reprovacoes
FROM analitico.v_base_motivo
GROUP BY GROUPING SETS ((produto, motivo, rota), (produto, rota));
CREATE INDEX mv_motivo_rota_idx ON analitico.mv_motivo_rota (produto, motivo, reprovacoes DESC);

CREATE MATERIALIZED VIEW analitico.mv_motivo_cliente AS
SELECT produto, CASE WHEN GROUPING(motivo) = 1 THEN 'Todos' ELSE motivo END AS motivo,
  cliente AS item, count(*) AS reprovacoes
FROM analitico.v_base_motivo
GROUP BY GROUPING SETS ((produto, motivo, cliente), (produto, cliente));
CREATE INDEX mv_motivo_cliente_idx ON analitico.mv_motivo_cliente (produto, motivo, reprovacoes DESC);

CREATE MATERIALIZED VIEW analitico.mv_motivo_coloader AS
SELECT produto, CASE WHEN GROUPING(motivo) = 1 THEN 'Todos' ELSE motivo END AS motivo,
  coloader AS item, count(*) AS reprovacoes
FROM analitico.v_base_motivo
GROUP BY GROUPING SETS ((produto, motivo, coloader), (produto, coloader));
CREATE INDEX mv_motivo_coloader_idx ON analitico.mv_motivo_coloader (produto, motivo, reprovacoes DESC);

CREATE MATERIALIZED VIEW analitico.mv_motivo_agente AS
SELECT produto, CASE WHEN GROUPING(motivo) = 1 THEN 'Todos' ELSE motivo END AS motivo,
  agente AS item, count(*) AS reprovacoes
FROM analitico.v_base_motivo
GROUP BY GROUPING SETS ((produto, motivo, agente), (produto, agente));
CREATE INDEX mv_motivo_agente_idx ON analitico.mv_motivo_agente (produto, motivo, reprovacoes DESC);

CREATE MATERIALIZED VIEW analitico.mv_motivo_rota_cliente AS
SELECT produto, CASE WHEN GROUPING(motivo) = 1 THEN 'Todos' ELSE motivo END AS motivo,
  rota, cliente, count(*) AS reprovacoes
FROM analitico.v_base_motivo
GROUP BY GROUPING SETS ((produto, motivo, rota, cliente), (produto, rota, cliente));
CREATE INDEX mv_motivo_rota_cliente_idx ON analitico.mv_motivo_rota_cliente (produto, motivo, reprovacoes DESC);

CREATE MATERIALIZED VIEW analitico.mv_motivo_mes AS
SELECT produto, CASE WHEN GROUPING(motivo) = 1 THEN 'Todos' ELSE motivo END AS motivo,
  mes, count(*) AS reprovacoes
FROM analitico.v_base_motivo
WHERE mes IS NOT NULL
GROUP BY GROUPING SETS ((produto, motivo, mes), (produto, mes));
CREATE INDEX mv_motivo_mes_idx ON analitico.mv_motivo_mes (produto, motivo, mes);

GRANT USAGE ON SCHEMA analitico TO authenticated;
GRANT SELECT ON analitico.mv_motivo_ind, analitico.mv_motivo_rota, analitico.mv_motivo_cliente,
  analitico.mv_motivo_coloader, analitico.mv_motivo_agente, analitico.mv_motivo_rota_cliente,
  analitico.mv_motivo_mes TO authenticated;

CREATE OR REPLACE FUNCTION public.motivos_perda_opcoes_filtro()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public, analitico
AS $$
  SELECT jsonb_build_object(
    'motivos',
    COALESCE((
      SELECT jsonb_agg(motivo ORDER BY motivo)
      FROM analitico.mv_motivo_ind
      WHERE produto = public.produto_do_usuario() AND motivo <> 'Todos'
    ), '[]'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION public.motivos_perda_analise(p_motivo text DEFAULT 'Todos')
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public, analitico
AS $$
WITH prod AS (SELECT public.produto_do_usuario() AS p),
tot AS (
  SELECT reprovacoes FROM analitico.mv_motivo_ind m, prod
  WHERE m.produto = prod.p AND m.motivo = 'Todos'
),
ind AS (
  SELECT m.* FROM analitico.mv_motivo_ind m, prod
  WHERE m.produto = prod.p AND m.motivo = p_motivo
),
rk_rot AS (
  SELECT jsonb_agg(x) AS j FROM (
    SELECT item, reprovacoes,
      CASE WHEN (SELECT reprovacoes FROM ind) > 0
        THEN reprovacoes::numeric / (SELECT reprovacoes FROM ind) ELSE 0 END AS pct_motivo
    FROM analitico.mv_motivo_rota m, prod
    WHERE m.produto = prod.p AND m.motivo = p_motivo
    ORDER BY reprovacoes DESC, item LIMIT 10
  ) x
),
rk_cli AS (
  SELECT jsonb_agg(x) AS j FROM (
    SELECT item, reprovacoes,
      CASE WHEN (SELECT reprovacoes FROM ind) > 0
        THEN reprovacoes::numeric / (SELECT reprovacoes FROM ind) ELSE 0 END AS pct_motivo
    FROM analitico.mv_motivo_cliente m, prod
    WHERE m.produto = prod.p AND m.motivo = p_motivo
    ORDER BY reprovacoes DESC, item LIMIT 10
  ) x
),
rk_col AS (
  SELECT jsonb_agg(x) AS j FROM (
    SELECT item, reprovacoes,
      CASE WHEN (SELECT reprovacoes FROM ind) > 0
        THEN reprovacoes::numeric / (SELECT reprovacoes FROM ind) ELSE 0 END AS pct_motivo
    FROM analitico.mv_motivo_coloader m, prod
    WHERE m.produto = prod.p AND m.motivo = p_motivo
    ORDER BY reprovacoes DESC, item LIMIT 10
  ) x
),
rk_age AS (
  SELECT jsonb_agg(x) AS j FROM (
    SELECT item, reprovacoes,
      CASE WHEN (SELECT reprovacoes FROM ind) > 0
        THEN reprovacoes::numeric / (SELECT reprovacoes FROM ind) ELSE 0 END AS pct_motivo
    FROM analitico.mv_motivo_agente m, prod
    WHERE m.produto = prod.p AND m.motivo = p_motivo
    ORDER BY reprovacoes DESC, item LIMIT 10
  ) x
),
rk_rc AS (
  SELECT jsonb_agg(x) AS j FROM (
    SELECT rota, cliente, reprovacoes
    FROM analitico.mv_motivo_rota_cliente m, prod
    WHERE m.produto = prod.p AND m.motivo = p_motivo
    ORDER BY reprovacoes DESC, rota, cliente LIMIT 10
  ) x
),
ev AS (
  SELECT jsonb_agg(x ORDER BY x.mes) AS j FROM (
    SELECT m.mes::text AS mes, m.reprovacoes,
      CASE WHEN t.reprovacoes > 0 THEN m.reprovacoes::numeric / t.reprovacoes ELSE 0 END AS pct_mes
    FROM analitico.mv_motivo_mes m
    JOIN prod ON true
    LEFT JOIN analitico.mv_motivo_mes t
      ON t.produto = m.produto AND t.motivo = 'Todos' AND t.mes = m.mes
    WHERE m.produto = prod.p AND m.motivo = p_motivo
  ) x
)
SELECT jsonb_build_object(
  'indicadores', jsonb_build_object(
    'reprovacoes', COALESCE((SELECT reprovacoes FROM ind), 0),
    'pct_reprovacoes', CASE WHEN COALESCE((SELECT reprovacoes FROM tot), 0) > 0
      THEN COALESCE((SELECT reprovacoes FROM ind), 0)::numeric / (SELECT reprovacoes FROM tot) ELSE 0 END,
    'rotas', COALESCE((SELECT rotas FROM ind), 0),
    'clientes', COALESCE((SELECT clientes FROM ind), 0),
    'coloaders', COALESCE((SELECT coloaders FROM ind), 0),
    'agentes', COALESCE((SELECT agentes FROM ind), 0),
    'meses', COALESCE((SELECT meses FROM ind), 0),
    'amostra', COALESCE((SELECT reprovacoes FROM ind), 0)
  ),
  'perfil', jsonb_build_object(
    'principal_rota', (SELECT item FROM analitico.mv_motivo_rota m, prod WHERE m.produto = prod.p AND m.motivo = p_motivo ORDER BY reprovacoes DESC, item LIMIT 1),
    'principal_cliente', (SELECT item FROM analitico.mv_motivo_cliente m, prod WHERE m.produto = prod.p AND m.motivo = p_motivo ORDER BY reprovacoes DESC, item LIMIT 1),
    'principal_coloader', (SELECT item FROM analitico.mv_motivo_coloader m, prod WHERE m.produto = prod.p AND m.motivo = p_motivo ORDER BY reprovacoes DESC, item LIMIT 1),
    'principal_agente', (SELECT item FROM analitico.mv_motivo_agente m, prod WHERE m.produto = prod.p AND m.motivo = p_motivo ORDER BY reprovacoes DESC, item LIMIT 1)
  ),
  'motivo_rota', COALESCE((SELECT j FROM rk_rot), '[]'::jsonb),
  'motivo_cliente', COALESCE((SELECT j FROM rk_cli), '[]'::jsonb),
  'coloaders', COALESCE((SELECT j FROM rk_col), '[]'::jsonb),
  'agentes', COALESCE((SELECT j FROM rk_age), '[]'::jsonb),
  'rota_cliente', COALESCE((SELECT j FROM rk_rc), '[]'::jsonb),
  'evolucao_mensal', COALESCE((SELECT j FROM ev), '[]'::jsonb)
);
$$;

REVOKE ALL ON FUNCTION public.motivos_perda_opcoes_filtro() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.motivos_perda_analise(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.motivos_perda_opcoes_filtro() TO authenticated;
GRANT EXECUTE ON FUNCTION public.motivos_perda_analise(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.atualizar_analises()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'analitico'
AS $function$
begin
  refresh materialized view analitico.mv_kpis_geral;
  refresh materialized view analitico.mv_ofertas_mensal;
  refresh materialized view analitico.mv_rotas;
  refresh materialized view analitico.mv_clientes;
  refresh materialized view analitico.mv_coloaders;
  refresh materialized view analitico.mv_agentes;
  refresh materialized view analitico.mv_analistas;
  refresh materialized view analitico.mv_vendedores;
  refresh materialized view analitico.mv_motivos_perda;
  refresh materialized view analitico.mv_qualidade_dados;
  refresh materialized view analitico.mv_cliente_lista;
  refresh materialized view analitico.mv_cliente_media_geral;
  refresh materialized view analitico.mv_analista_ind;
  refresh materialized view analitico.mv_analista_cliente;
  refresh materialized view analitico.mv_analista_rota;
  refresh materialized view analitico.mv_analista_coloader;
  refresh materialized view analitico.mv_analista_agente;
  refresh materialized view analitico.mv_analista_motivo;
  refresh materialized view analitico.mv_analista_rota_agente;
  refresh materialized view analitico.mv_motivo_ind;
  refresh materialized view analitico.mv_motivo_rota;
  refresh materialized view analitico.mv_motivo_cliente;
  refresh materialized view analitico.mv_motivo_coloader;
  refresh materialized view analitico.mv_motivo_agente;
  refresh materialized view analitico.mv_motivo_rota_cliente;
  refresh materialized view analitico.mv_motivo_mes;
end;
$function$;