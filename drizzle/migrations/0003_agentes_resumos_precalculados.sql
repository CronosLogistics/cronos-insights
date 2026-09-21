-- Base pré-calculada de Agentes (inclui linha de rollup 'Todos')
DROP MATERIALIZED VIEW IF EXISTS analitico.mv_agente_rota_coloader;
DROP MATERIALIZED VIEW IF EXISTS analitico.mv_agente_motivo;
DROP MATERIALIZED VIEW IF EXISTS analitico.mv_agente_coloader;
DROP MATERIALIZED VIEW IF EXISTS analitico.mv_agente_rota;
DROP MATERIALIZED VIEW IF EXISTS analitico.mv_agente_cliente;
DROP MATERIALIZED VIEW IF EXISTS analitico.mv_agente_ind;
DROP MATERIALIZED VIEW IF EXISTS analitico.mv_agente_base;

CREATE MATERIALIZED VIEW analitico.mv_agente_base AS
WITH base AS (
  SELECT
    o.produto,
    COALESCE(NULLIF(btrim(o.agente), ''), '(Não informado)') AS agente,
    NULLIF(btrim(COALESCE(o.oferta, '')), '') AS oferta,
    COALESCE(NULLIF(btrim(o.cliente), ''), '(Não informado)') AS cliente,
    COALESCE(NULLIF(btrim(o.origem), ''), 'Não informado') || ' → ' || COALESCE(NULLIF(btrim(o.destino), ''), 'Não informado') AS rota,
    COALESCE(NULLIF(btrim(o.armador), ''), '(Não informado)') AS coloader,
    COALESCE(NULLIF(btrim(o.motivo), ''), '(Não informado)') AS motivo,
    (o.analise = 'Aprovado')::int AS fa,
    (o.analise = 'Reprovado')::int AS fr,
    (o.analise = 'Em Aberto')::int AS fe
  FROM public.ofertas o
  WHERE o.produto IS NOT NULL
)
SELECT b.produto, g.agente_key AS agente, b.oferta, b.cliente, b.rota, b.coloader, b.motivo, b.fa, b.fr, b.fe
FROM base b
CROSS JOIN LATERAL (VALUES (b.agente), ('Todos')) AS g(agente_key);

CREATE INDEX mv_agente_base_idx ON analitico.mv_agente_base (produto, agente);

CREATE MATERIALIZED VIEW analitico.mv_agente_ind AS
SELECT produto, agente,
  count(*)::bigint AS rotas,
  count(DISTINCT oferta)::bigint AS ofertas,
  sum(fa)::bigint AS aprovadas,
  sum(fr)::bigint AS reprovadas,
  sum(fe)::bigint AS em_analise
FROM analitico.mv_agente_base GROUP BY 1, 2;
CREATE UNIQUE INDEX mv_agente_ind_pk ON analitico.mv_agente_ind (produto, agente);

CREATE MATERIALIZED VIEW analitico.mv_agente_cliente AS
SELECT produto, agente, cliente AS item, count(*)::bigint AS rotas,
  sum(fa)::bigint AS aprovadas, sum(fr)::bigint AS reprovadas, sum(fe)::bigint AS em_analise
FROM analitico.mv_agente_base GROUP BY 1, 2, 3;
CREATE INDEX mv_agente_cliente_idx ON analitico.mv_agente_cliente (produto, agente);

CREATE MATERIALIZED VIEW analitico.mv_agente_rota AS
SELECT produto, agente, rota AS item, count(*)::bigint AS rotas,
  sum(fa)::bigint AS aprovadas, sum(fr)::bigint AS reprovadas, sum(fe)::bigint AS em_analise
FROM analitico.mv_agente_base GROUP BY 1, 2, 3;
CREATE INDEX mv_agente_rota_idx ON analitico.mv_agente_rota (produto, agente);

CREATE MATERIALIZED VIEW analitico.mv_agente_coloader AS
SELECT produto, agente, coloader AS item, count(*)::bigint AS rotas,
  sum(fa)::bigint AS aprovadas, sum(fr)::bigint AS reprovadas, sum(fe)::bigint AS em_analise
FROM analitico.mv_agente_base GROUP BY 1, 2, 3;
CREATE INDEX mv_agente_coloader_idx ON analitico.mv_agente_coloader (produto, agente);

CREATE MATERIALIZED VIEW analitico.mv_agente_motivo AS
SELECT produto, agente, motivo, count(*)::bigint AS reprovadas
FROM analitico.mv_agente_base WHERE fr = 1 GROUP BY 1, 2, 3;
CREATE INDEX mv_agente_motivo_idx ON analitico.mv_agente_motivo (produto, agente);

CREATE MATERIALIZED VIEW analitico.mv_agente_rota_coloader AS
SELECT produto, agente, rota, coloader, count(*)::bigint AS rotas,
  sum(fa)::bigint AS aprovadas, sum(fr)::bigint AS reprovadas, sum(fe)::bigint AS em_analise
FROM analitico.mv_agente_base GROUP BY 1, 2, 3, 4;
CREATE INDEX mv_agente_rota_coloader_idx ON analitico.mv_agente_rota_coloader (produto, agente);

GRANT USAGE ON SCHEMA analitico TO authenticated, service_role;
GRANT SELECT ON analitico.mv_agente_base, analitico.mv_agente_ind, analitico.mv_agente_cliente,
  analitico.mv_agente_rota, analitico.mv_agente_coloader, analitico.mv_agente_motivo,
  analitico.mv_agente_rota_coloader TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.agentes_opcoes_filtro()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public', 'analitico'
AS $function$
  SELECT jsonb_build_object(
    'agentes',
    COALESCE((SELECT jsonb_agg(DISTINCT m.agente ORDER BY m.agente)
              FROM analitico.mv_agente_ind m
              WHERE m.produto = ANY (public.produtos_do_usuario()) AND m.agente <> 'Todos'), '[]'::jsonb)
  );
$function$;

CREATE OR REPLACE FUNCTION public.agentes_analise(p_agente text DEFAULT 'Todos'::text)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public', 'analitico'
AS $function$
WITH prod AS (SELECT public.produtos_do_usuario() AS prods),
cli AS (SELECT m.item, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
        FROM analitico.mv_agente_cliente m, prod
        WHERE m.produto = ANY (prod.prods) AND m.agente = p_agente GROUP BY m.item),
rot AS (SELECT m.item, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
        FROM analitico.mv_agente_rota m, prod
        WHERE m.produto = ANY (prod.prods) AND m.agente = p_agente GROUP BY m.item),
col AS (SELECT m.item, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
        FROM analitico.mv_agente_coloader m, prod
        WHERE m.produto = ANY (prod.prods) AND m.agente = p_agente GROUP BY m.item),
mot AS (SELECT m.motivo, sum(m.reprovadas)::bigint reprovadas
        FROM analitico.mv_agente_motivo m, prod
        WHERE m.produto = ANY (prod.prods) AND m.agente = p_agente GROUP BY m.motivo),
rc AS (SELECT m.rota, m.coloader, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
       FROM analitico.mv_agente_rota_coloader m, prod
       WHERE m.produto = ANY (prod.prods) AND m.agente = p_agente GROUP BY m.rota, m.coloader),
ind AS (SELECT sum(m.rotas)::bigint rotas, sum(m.ofertas)::bigint ofertas, sum(m.aprovadas)::bigint aprovadas,
               sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
        FROM analitico.mv_agente_ind m, prod
        WHERE m.produto = ANY (prod.prods) AND m.agente = p_agente),
media AS (SELECT sum(m.aprovadas)::bigint ap, sum(m.reprovadas)::bigint rp
          FROM analitico.mv_agente_ind m, prod
          WHERE m.produto = ANY (prod.prods) AND m.agente = 'Todos')
SELECT jsonb_build_object(
  'indicadores', jsonb_build_object(
    'rotas', COALESCE((SELECT rotas FROM ind), 0),
    'ofertas', COALESCE((SELECT ofertas FROM ind), 0),
    'clientes', (SELECT count(*) FROM cli),
    'rotas_distintas', (SELECT count(*) FROM rot),
    'coloaders', (SELECT count(*) FROM col),
    'aprovadas', COALESCE((SELECT aprovadas FROM ind), 0),
    'reprovadas', COALESCE((SELECT reprovadas FROM ind), 0),
    'em_analise', COALESCE((SELECT em_analise FROM ind), 0)),
  'mediaAprovadas', COALESCE((SELECT ap FROM media), 0),
  'mediaReprovadas', COALESCE((SELECT rp FROM media), 0),
  'clientes', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM cli ORDER BY rotas DESC, item LIMIT 10) x), '[]'::jsonb),
  'rotas', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM rot ORDER BY rotas DESC, item LIMIT 10) x), '[]'::jsonb),
  'coloaders', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM col ORDER BY rotas DESC, item LIMIT 10) x), '[]'::jsonb),
  'motivosTotal', COALESCE((SELECT sum(reprovadas) FROM mot), 0),
  'motivos', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM mot ORDER BY reprovadas DESC, motivo LIMIT 10) x), '[]'::jsonb),
  'rotaColoader', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM rc ORDER BY reprovadas DESC, rotas DESC, rota, coloader LIMIT 10) x), '[]'::jsonb)
);
$function$;

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
  REFRESH MATERIALIZED VIEW analitico.mv_agente_base;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_ind;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_cliente;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_rota;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_coloader;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_motivo;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_rota_coloader;
END;
$function$;