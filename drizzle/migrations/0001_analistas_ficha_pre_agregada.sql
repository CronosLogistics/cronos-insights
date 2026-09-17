-- Base interna (sem RLS, uso exclusivo das matviews do schema analitico)
CREATE OR REPLACE VIEW analitico.v_base_analitico AS
SELECT
  o.produto,
  o.oferta,
  COALESCE(NULLIF(btrim(o.pricing), ''), '(Não informado)') AS analista,
  COALESCE(NULLIF(btrim(o.cliente), ''), '(Não informado)') AS cliente,
  (COALESCE(NULLIF(btrim(o.origem), ''), 'Não informado') || ' → ') || COALESCE(NULLIF(btrim(o.destino), ''), 'Não informado') AS rota,
  COALESCE(NULLIF(btrim(o.armador), ''), '(Não informado)') AS coloader,
  COALESCE(NULLIF(btrim(o.agente), ''), '(Não informado)') AS agente,
  COALESCE(NULLIF(btrim(o.motivo), ''), '(Não informado)') AS motivo,
  (o.analise = 'Aprovado')::integer AS flag_aprovada,
  (o.analise = 'Reprovado')::integer AS flag_reprovada,
  (o.analise = 'Em Aberto')::integer AS flag_em_analise
FROM public.ofertas o
WHERE o.produto IS NOT NULL;

-- Indicadores por analista (+ linha 'Todos' via rollup)
CREATE MATERIALIZED VIEW analitico.mv_analista_ind AS
SELECT
  produto,
  CASE WHEN GROUPING(analista) = 1 THEN 'Todos' ELSE analista END AS analista,
  count(*) AS rotas,
  count(DISTINCT oferta) AS ofertas,
  count(DISTINCT cliente) AS clientes,
  count(DISTINCT rota) AS rotas_distintas,
  count(DISTINCT coloader) AS coloaders,
  COALESCE(sum(flag_aprovada), 0) AS aprovadas,
  COALESCE(sum(flag_reprovada), 0) AS reprovadas,
  COALESCE(sum(flag_em_analise), 0) AS em_analise
FROM analitico.v_base_analitico
GROUP BY GROUPING SETS ((produto, analista), (produto));

CREATE UNIQUE INDEX mv_analista_ind_pk ON analitico.mv_analista_ind (produto, analista);

CREATE MATERIALIZED VIEW analitico.mv_analista_cliente AS
SELECT produto,
  CASE WHEN GROUPING(analista) = 1 THEN 'Todos' ELSE analista END AS analista,
  cliente AS item,
  count(*) AS rotas,
  COALESCE(sum(flag_aprovada), 0) AS aprovadas,
  COALESCE(sum(flag_reprovada), 0) AS reprovadas,
  COALESCE(sum(flag_em_analise), 0) AS em_analise
FROM analitico.v_base_analitico
GROUP BY GROUPING SETS ((produto, analista, cliente), (produto, cliente));

CREATE INDEX mv_analista_cliente_idx ON analitico.mv_analista_cliente (produto, analista, rotas DESC);

CREATE MATERIALIZED VIEW analitico.mv_analista_rota AS
SELECT produto,
  CASE WHEN GROUPING(analista) = 1 THEN 'Todos' ELSE analista END AS analista,
  rota AS item,
  count(*) AS rotas,
  COALESCE(sum(flag_aprovada), 0) AS aprovadas,
  COALESCE(sum(flag_reprovada), 0) AS reprovadas,
  COALESCE(sum(flag_em_analise), 0) AS em_analise
FROM analitico.v_base_analitico
GROUP BY GROUPING SETS ((produto, analista, rota), (produto, rota));

CREATE INDEX mv_analista_rota_idx ON analitico.mv_analista_rota (produto, analista, rotas DESC);

CREATE MATERIALIZED VIEW analitico.mv_analista_coloader AS
SELECT produto,
  CASE WHEN GROUPING(analista) = 1 THEN 'Todos' ELSE analista END AS analista,
  coloader AS item,
  count(*) AS rotas,
  COALESCE(sum(flag_aprovada), 0) AS aprovadas,
  COALESCE(sum(flag_reprovada), 0) AS reprovadas,
  COALESCE(sum(flag_em_analise), 0) AS em_analise
FROM analitico.v_base_analitico
GROUP BY GROUPING SETS ((produto, analista, coloader), (produto, coloader));

CREATE INDEX mv_analista_coloader_idx ON analitico.mv_analista_coloader (produto, analista, rotas DESC);

CREATE MATERIALIZED VIEW analitico.mv_analista_agente AS
SELECT produto,
  CASE WHEN GROUPING(analista) = 1 THEN 'Todos' ELSE analista END AS analista,
  agente AS item,
  count(*) AS rotas,
  COALESCE(sum(flag_aprovada), 0) AS aprovadas,
  COALESCE(sum(flag_reprovada), 0) AS reprovadas,
  COALESCE(sum(flag_em_analise), 0) AS em_analise
FROM analitico.v_base_analitico
GROUP BY GROUPING SETS ((produto, analista, agente), (produto, agente));

CREATE INDEX mv_analista_agente_idx ON analitico.mv_analista_agente (produto, analista, rotas DESC);

CREATE MATERIALIZED VIEW analitico.mv_analista_motivo AS
SELECT produto,
  CASE WHEN GROUPING(analista) = 1 THEN 'Todos' ELSE analista END AS analista,
  motivo,
  count(*) AS reprovadas
FROM analitico.v_base_analitico
WHERE flag_reprovada = 1
GROUP BY GROUPING SETS ((produto, analista, motivo), (produto, motivo));

CREATE INDEX mv_analista_motivo_idx ON analitico.mv_analista_motivo (produto, analista, reprovadas DESC);

CREATE MATERIALIZED VIEW analitico.mv_analista_rota_agente AS
SELECT produto,
  CASE WHEN GROUPING(analista) = 1 THEN 'Todos' ELSE analista END AS analista,
  rota,
  agente,
  count(*) AS rotas,
  COALESCE(sum(flag_aprovada), 0) AS aprovadas,
  COALESCE(sum(flag_reprovada), 0) AS reprovadas,
  COALESCE(sum(flag_em_analise), 0) AS em_analise
FROM analitico.v_base_analitico
GROUP BY GROUPING SETS ((produto, analista, rota, agente), (produto, rota, agente));

CREATE INDEX mv_analista_rota_agente_idx ON analitico.mv_analista_rota_agente (produto, analista, reprovadas DESC, rotas DESC);

GRANT USAGE ON SCHEMA analitico TO authenticated;
GRANT SELECT ON analitico.mv_analista_ind, analitico.mv_analista_cliente, analitico.mv_analista_rota,
  analitico.mv_analista_coloader, analitico.mv_analista_agente, analitico.mv_analista_motivo,
  analitico.mv_analista_rota_agente TO authenticated;

-- Funções da tela Analistas passam a ler as agregações pré-calculadas
CREATE OR REPLACE FUNCTION public.analistas_opcoes_filtro()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public, analitico
AS $$
  SELECT jsonb_build_object(
    'analistas',
    COALESCE((
      SELECT jsonb_agg(analista ORDER BY analista)
      FROM analitico.mv_analista_ind
      WHERE produto = public.produto_do_usuario() AND analista <> 'Todos'
    ), '[]'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION public.analistas_analise(p_analista text DEFAULT 'Todos')
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public, analitico
AS $$
WITH prod AS (SELECT public.produto_do_usuario() AS p),
ind AS (
  SELECT jsonb_build_object(
    'rotas', rotas, 'ofertas', ofertas, 'clientes', clientes,
    'rotas_distintas', rotas_distintas, 'coloaders', coloaders,
    'aprovadas', aprovadas, 'reprovadas', reprovadas, 'em_analise', em_analise
  ) AS j
  FROM analitico.mv_analista_ind m, prod
  WHERE m.produto = prod.p AND m.analista = p_analista
),
media AS (
  SELECT aprovadas AS ap, reprovadas AS rp
  FROM analitico.mv_analista_ind m, prod
  WHERE m.produto = prod.p AND m.analista = 'Todos'
),
rk_cli AS (
  SELECT jsonb_agg(x) AS j FROM (
    SELECT item, rotas, aprovadas, reprovadas, em_analise
    FROM analitico.mv_analista_cliente m, prod
    WHERE m.produto = prod.p AND m.analista = p_analista
    ORDER BY rotas DESC, item LIMIT 10
  ) x
),
rk_rot AS (
  SELECT jsonb_agg(x) AS j FROM (
    SELECT item, rotas, aprovadas, reprovadas, em_analise
    FROM analitico.mv_analista_rota m, prod
    WHERE m.produto = prod.p AND m.analista = p_analista
    ORDER BY rotas DESC, item LIMIT 10
  ) x
),
rk_col AS (
  SELECT jsonb_agg(x) AS j FROM (
    SELECT item, rotas, aprovadas, reprovadas, em_analise
    FROM analitico.mv_analista_coloader m, prod
    WHERE m.produto = prod.p AND m.analista = p_analista
    ORDER BY rotas DESC, item LIMIT 10
  ) x
),
rk_age AS (
  SELECT jsonb_agg(x) AS j FROM (
    SELECT item, rotas, aprovadas, reprovadas, em_analise
    FROM analitico.mv_analista_agente m, prod
    WHERE m.produto = prod.p AND m.analista = p_analista
    ORDER BY rotas DESC, item LIMIT 10
  ) x
),
mot AS (
  SELECT COALESCE(sum(reprovadas), 0) AS total
  FROM analitico.mv_analista_motivo m, prod
  WHERE m.produto = prod.p AND m.analista = p_analista
),
rk_mot AS (
  SELECT jsonb_agg(x) AS j FROM (
    SELECT motivo, reprovadas
    FROM analitico.mv_analista_motivo m, prod
    WHERE m.produto = prod.p AND m.analista = p_analista
    ORDER BY reprovadas DESC, motivo LIMIT 10
  ) x
),
rk_ra AS (
  SELECT jsonb_agg(x) AS j FROM (
    SELECT rota, agente, rotas, aprovadas, reprovadas, em_analise
    FROM analitico.mv_analista_rota_agente m, prod
    WHERE m.produto = prod.p AND m.analista = p_analista
    ORDER BY reprovadas DESC, rotas DESC, rota, agente LIMIT 10
  ) x
)
SELECT jsonb_build_object(
  'indicadores', COALESCE((SELECT j FROM ind), jsonb_build_object(
    'rotas', 0, 'ofertas', 0, 'clientes', 0, 'rotas_distintas', 0,
    'coloaders', 0, 'aprovadas', 0, 'reprovadas', 0, 'em_analise', 0)),
  'mediaAprovadas', COALESCE((SELECT ap FROM media), 0),
  'mediaReprovadas', COALESCE((SELECT rp FROM media), 0),
  'clientes', COALESCE((SELECT j FROM rk_cli), '[]'::jsonb),
  'rotas', COALESCE((SELECT j FROM rk_rot), '[]'::jsonb),
  'coloaders', COALESCE((SELECT j FROM rk_col), '[]'::jsonb),
  'agentes', COALESCE((SELECT j FROM rk_age), '[]'::jsonb),
  'motivosTotal', COALESCE((SELECT total FROM mot), 0),
  'motivos', COALESCE((SELECT j FROM rk_mot), '[]'::jsonb),
  'rotaAgente', COALESCE((SELECT j FROM rk_ra), '[]'::jsonb)
);
$$;

REVOKE ALL ON FUNCTION public.analistas_opcoes_filtro() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.analistas_analise(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analistas_opcoes_filtro() TO authenticated;
GRANT EXECUTE ON FUNCTION public.analistas_analise(text) TO authenticated;

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
end;
$function$;
