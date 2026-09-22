CREATE MATERIALIZED VIEW analitico.mv_coloader_base AS
WITH base AS (
  SELECT o.produto,
         COALESCE(NULLIF(btrim(o.armador), ''), '(Não informado)') AS coloader,
         NULLIF(btrim(COALESCE(o.oferta, '')), '') AS oferta,
         COALESCE(NULLIF(btrim(o.cliente), ''), '(Não informado)') AS cliente,
         (COALESCE(NULLIF(btrim(o.origem), ''), 'Não informado') || ' → ' || COALESCE(NULLIF(btrim(o.destino), ''), 'Não informado')) AS rota,
         COALESCE(NULLIF(btrim(o.agente), ''), '(Não informado)') AS agente,
         COALESCE(NULLIF(btrim(o.motivo), ''), '(Não informado)') AS motivo,
         (o.analise = 'Aprovado')::int AS fa,
         (o.analise = 'Reprovado')::int AS fr,
         (o.analise = 'Em Aberto')::int AS fe
  FROM public.ofertas o
  WHERE o.produto IS NOT NULL
)
SELECT b.produto, g.coloader_key AS coloader, b.coloader AS coloader_real,
       b.oferta, b.cliente, b.rota, b.agente, b.motivo, b.fa, b.fr, b.fe
FROM base b
CROSS JOIN LATERAL (VALUES (b.coloader), ('Todos')) g(coloader_key);

CREATE INDEX idx_mv_coloader_base_pc ON analitico.mv_coloader_base (produto, coloader);

CREATE MATERIALIZED VIEW analitico.mv_coloader_ind AS
SELECT produto, coloader,
       count(*)::bigint AS rotas,
       count(DISTINCT oferta)::bigint AS ofertas,
       count(DISTINCT coloader_real)::bigint AS coloaders,
       COALESCE(sum(fa), 0)::bigint AS aprovadas,
       COALESCE(sum(fr), 0)::bigint AS reprovadas,
       COALESCE(sum(fe), 0)::bigint AS em_analise
FROM analitico.mv_coloader_base
GROUP BY 1, 2;
CREATE INDEX idx_mv_coloader_ind_pc ON analitico.mv_coloader_ind (produto, coloader);

CREATE MATERIALIZED VIEW analitico.mv_coloader_cliente AS
SELECT produto, coloader, cliente AS item,
       count(*)::bigint AS rotas,
       COALESCE(sum(fa), 0)::bigint AS aprovadas,
       COALESCE(sum(fr), 0)::bigint AS reprovadas,
       COALESCE(sum(fe), 0)::bigint AS em_analise
FROM analitico.mv_coloader_base GROUP BY 1, 2, 3;
CREATE INDEX idx_mv_coloader_cliente_pc ON analitico.mv_coloader_cliente (produto, coloader);

CREATE MATERIALIZED VIEW analitico.mv_coloader_rota AS
SELECT produto, coloader, rota AS item,
       count(*)::bigint AS rotas,
       COALESCE(sum(fa), 0)::bigint AS aprovadas,
       COALESCE(sum(fr), 0)::bigint AS reprovadas,
       COALESCE(sum(fe), 0)::bigint AS em_analise
FROM analitico.mv_coloader_base GROUP BY 1, 2, 3;
CREATE INDEX idx_mv_coloader_rota_pc ON analitico.mv_coloader_rota (produto, coloader);

CREATE MATERIALIZED VIEW analitico.mv_coloader_agente AS
SELECT produto, coloader, agente AS item,
       count(*)::bigint AS rotas,
       COALESCE(sum(fa), 0)::bigint AS aprovadas,
       COALESCE(sum(fr), 0)::bigint AS reprovadas,
       COALESCE(sum(fe), 0)::bigint AS em_analise
FROM analitico.mv_coloader_base GROUP BY 1, 2, 3;
CREATE INDEX idx_mv_coloader_agente_pc ON analitico.mv_coloader_agente (produto, coloader);

CREATE MATERIALIZED VIEW analitico.mv_coloader_motivo AS
SELECT produto, coloader, motivo, count(*)::bigint AS reprovadas
FROM analitico.mv_coloader_base WHERE fr = 1 GROUP BY 1, 2, 3;
CREATE INDEX idx_mv_coloader_motivo_pc ON analitico.mv_coloader_motivo (produto, coloader);

CREATE MATERIALIZED VIEW analitico.mv_coloader_rota_cliente AS
SELECT produto, coloader, rota, cliente,
       count(*)::bigint AS rotas,
       COALESCE(sum(fa), 0)::bigint AS aprovadas,
       COALESCE(sum(fr), 0)::bigint AS reprovadas,
       COALESCE(sum(fe), 0)::bigint AS em_analise
FROM analitico.mv_coloader_base GROUP BY 1, 2, 3, 4;
CREATE INDEX idx_mv_coloader_rota_cliente_pc ON analitico.mv_coloader_rota_cliente (produto, coloader);

CREATE OR REPLACE FUNCTION public.coloaders_opcoes_filtro()
RETURNS jsonb LANGUAGE sql STABLE SET search_path TO 'public', 'analitico'
AS $$
  SELECT jsonb_build_object(
    'coloaders',
    COALESCE((SELECT jsonb_agg(DISTINCT m.coloader ORDER BY m.coloader)
              FROM analitico.mv_coloader_ind m
              WHERE m.produto = ANY (public.produtos_do_usuario()) AND m.coloader <> 'Todos'), '[]'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION public.coloaders_analise(p_coloader text DEFAULT 'Todos'::text)
RETURNS jsonb LANGUAGE sql STABLE SET search_path TO 'public', 'analitico'
AS $$
WITH prod AS (SELECT public.produtos_do_usuario() AS prods),
cli AS (SELECT m.item, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
        FROM analitico.mv_coloader_cliente m, prod
        WHERE m.produto = ANY (prod.prods) AND m.coloader = p_coloader GROUP BY m.item),
rot AS (SELECT m.item, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
        FROM analitico.mv_coloader_rota m, prod
        WHERE m.produto = ANY (prod.prods) AND m.coloader = p_coloader GROUP BY m.item),
age AS (SELECT m.item, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
        FROM analitico.mv_coloader_agente m, prod
        WHERE m.produto = ANY (prod.prods) AND m.coloader = p_coloader GROUP BY m.item),
mot AS (SELECT m.motivo, sum(m.reprovadas)::bigint reprovadas
        FROM analitico.mv_coloader_motivo m, prod
        WHERE m.produto = ANY (prod.prods) AND m.coloader = p_coloader GROUP BY m.motivo),
rc AS (SELECT m.rota, m.cliente, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
       FROM analitico.mv_coloader_rota_cliente m, prod
       WHERE m.produto = ANY (prod.prods) AND m.coloader = p_coloader GROUP BY m.rota, m.cliente),
ind AS (SELECT sum(m.rotas)::bigint rotas, sum(m.ofertas)::bigint ofertas, sum(m.coloaders)::bigint coloaders,
               sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
        FROM analitico.mv_coloader_ind m, prod
        WHERE m.produto = ANY (prod.prods) AND m.coloader = p_coloader),
media AS (SELECT sum(m.aprovadas)::bigint ap, sum(m.reprovadas)::bigint rp
          FROM analitico.mv_coloader_ind m, prod
          WHERE m.produto = ANY (prod.prods) AND m.coloader = 'Todos')
SELECT jsonb_build_object(
  'indicadores', jsonb_build_object(
    'rotas', COALESCE((SELECT rotas FROM ind), 0),
    'ofertas', COALESCE((SELECT ofertas FROM ind), 0),
    'clientes', (SELECT count(*) FROM cli),
    'rotas_distintas', (SELECT count(*) FROM rot),
    'coloaders', COALESCE((SELECT coloaders FROM ind), 0),
    'aprovadas', COALESCE((SELECT aprovadas FROM ind), 0),
    'reprovadas', COALESCE((SELECT reprovadas FROM ind), 0),
    'em_analise', COALESCE((SELECT em_analise FROM ind), 0)),
  'mediaAprovadas', COALESCE((SELECT ap FROM media), 0),
  'mediaReprovadas', COALESCE((SELECT rp FROM media), 0),
  'clientes', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM cli ORDER BY rotas DESC, item LIMIT 10) x), '[]'::jsonb),
  'rotas', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM rot ORDER BY rotas DESC, item LIMIT 10) x), '[]'::jsonb),
  'agentes', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM age ORDER BY rotas DESC, item LIMIT 10) x), '[]'::jsonb),
  'motivosTotal', COALESCE((SELECT sum(reprovadas) FROM mot), 0),
  'motivos', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM mot ORDER BY reprovadas DESC, motivo LIMIT 10) x), '[]'::jsonb),
  'rotaCliente', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM rc ORDER BY reprovadas DESC, rotas DESC, rota, cliente LIMIT 10) x), '[]'::jsonb)
);
$$;

CREATE OR REPLACE FUNCTION public.atualizar_analises()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'analitico'
AS $$
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
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_base;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_ind;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_cliente;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_rota;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_agente;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_motivo;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_rota_cliente;
END;
$$;
