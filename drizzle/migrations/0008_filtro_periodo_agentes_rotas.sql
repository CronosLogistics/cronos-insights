CREATE MATERIALIZED VIEW analitico.mv_agente_dt AS
SELECT o.produto,
  COALESCE(NULLIF(btrim(o.agente), ''), '(Não informado)') AS agente,
  NULLIF(btrim(COALESCE(o.oferta, '')), '') AS oferta,
  COALESCE(NULLIF(btrim(o.cliente), ''), '(Não informado)') AS cliente,
  (COALESCE(NULLIF(btrim(o.origem), ''), 'Não informado') || ' → ' || COALESCE(NULLIF(btrim(o.destino), ''), 'Não informado')) AS rota,
  COALESCE(NULLIF(btrim(o.armador), ''), '(Não informado)') AS coloader,
  COALESCE(NULLIF(btrim(o.motivo), ''), '(Não informado)') AS motivo,
  (o.analise = 'Aprovado')::integer AS fa,
  (o.analise = 'Reprovado')::integer AS fr,
  (o.analise = 'Em Aberto')::integer AS fe,
  o.data_abertura::date AS data_abertura
FROM public.ofertas o WHERE o.produto IS NOT NULL;
CREATE INDEX mv_agente_dt_idx ON analitico.mv_agente_dt (produto, agente, data_abertura);
CREATE INDEX mv_agente_dt_data_idx ON analitico.mv_agente_dt (produto, data_abertura);

CREATE MATERIALIZED VIEW analitico.mv_rota_dt AS
SELECT produto, oferta,
  COALESCE(NULLIF(btrim(cliente), ''), '(Não informado)') AS cliente,
  (COALESCE(NULLIF(btrim(origem), ''), 'Não informado') || ' → ' || COALESCE(NULLIF(btrim(destino), ''), 'Não informado')) AS rota,
  COALESCE(NULLIF(btrim(armador), ''), '(Não informado)') AS coloader,
  COALESCE(NULLIF(btrim(agente), ''), '(Não informado)') AS agente,
  COALESCE(NULLIF(btrim(motivo), ''), '(Não informado)') AS motivo,
  COALESCE(NULLIF(btrim(pais_origem), ''), '(Não informado)') AS pais_origem,
  COALESCE(NULLIF(btrim(origem), ''), '(Não informado)') AS porto_origem,
  COALESCE(NULLIF(btrim(pais_destino), ''), '(Não informado)') AS pais_destino,
  COALESCE(NULLIF(btrim(destino), ''), '(Não informado)') AS porto_destino,
  (analise = 'Aprovado')::integer AS apr,
  (analise = 'Reprovado')::integer AS rep,
  (analise = 'Em Aberto')::integer AS ema,
  data_abertura::date AS data_abertura
FROM public.ofertas o WHERE produto IS NOT NULL;
CREATE INDEX mv_rota_dt_prod_idx ON analitico.mv_rota_dt (produto, data_abertura);
CREATE INDEX mv_rota_dt_origem_idx ON analitico.mv_rota_dt (produto, pais_origem, porto_origem);
CREATE INDEX mv_rota_dt_destino_idx ON analitico.mv_rota_dt (produto, pais_destino, porto_destino);
CREATE INDEX mv_rota_dt_rota_idx ON analitico.mv_rota_dt (produto, rota);

ALTER FUNCTION public.agentes_analise(text) RENAME TO agentes_analise_padrao;

CREATE FUNCTION public.agentes_analise(p_agente text DEFAULT 'Todos', p_data_inicial date DEFAULT NULL, p_data_final date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'analitico'
AS $f$
DECLARE r jsonb;
BEGIN
  IF p_data_inicial IS NULL AND p_data_final IS NULL THEN
    RETURN public.agentes_analise_padrao(p_agente);
  END IF;
  WITH base AS MATERIALIZED (
    SELECT * FROM analitico.mv_agente_dt
    WHERE produto = ANY (public.produtos_do_usuario())
      AND (p_agente = 'Todos' OR agente = p_agente)
      AND (p_data_inicial IS NULL OR data_abertura >= p_data_inicial)
      AND (p_data_final IS NULL OR data_abertura <= p_data_final)
  ),
  g AS (SELECT count(*)::bigint rotas, count(DISTINCT oferta)::bigint ofertas, count(DISTINCT cliente)::bigint clientes,
          count(DISTINCT rota)::bigint rotas_distintas, count(DISTINCT coloader)::bigint coloaders,
          coalesce(sum(fa),0)::bigint aprovadas, coalesce(sum(fr),0)::bigint reprovadas, coalesce(sum(fe),0)::bigint em_analise FROM base),
  cli AS (SELECT cliente item, count(*)::bigint rotas, sum(fa)::bigint aprovadas, sum(fr)::bigint reprovadas, sum(fe)::bigint em_analise FROM base GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10),
  rot AS (SELECT rota item, count(*)::bigint rotas, sum(fa)::bigint aprovadas, sum(fr)::bigint reprovadas, sum(fe)::bigint em_analise FROM base GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10),
  col AS (SELECT coloader item, count(*)::bigint rotas, sum(fa)::bigint aprovadas, sum(fr)::bigint reprovadas, sum(fe)::bigint em_analise FROM base GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10),
  mot AS (SELECT motivo, count(*)::bigint reprovadas FROM base WHERE fr = 1 GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10),
  rc AS (SELECT rota, coloader, count(*)::bigint rotas, sum(fa)::bigint aprovadas, sum(fr)::bigint reprovadas, sum(fe)::bigint em_analise FROM base GROUP BY 1,2 ORDER BY 5 DESC, 3 DESC, 1, 2 LIMIT 10),
  media AS (SELECT sum(m.aprovadas)::bigint ap, sum(m.reprovadas)::bigint rp FROM analitico.mv_agente_ind m
            WHERE m.produto = ANY (public.produtos_do_usuario()) AND m.agente = 'Todos')
  SELECT jsonb_build_object(
    'indicadores', (SELECT to_jsonb(g) FROM g),
    'mediaAprovadas', COALESCE((SELECT ap FROM media), 0),
    'mediaReprovadas', COALESCE((SELECT rp FROM media), 0),
    'clientes', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.rotas DESC, x.item) FROM cli x), '[]'::jsonb),
    'rotas', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.rotas DESC, x.item) FROM rot x), '[]'::jsonb),
    'coloaders', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.rotas DESC, x.item) FROM col x), '[]'::jsonb),
    'motivosTotal', (SELECT reprovadas FROM g),
    'motivos', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.reprovadas DESC, x.motivo) FROM mot x), '[]'::jsonb),
    'rotaColoader', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.reprovadas DESC, x.rotas DESC, x.rota, x.coloader) FROM rc x), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $f$;

ALTER FUNCTION public.rotas_analise(text,text,text,text,text) RENAME TO rotas_analise_padrao;

CREATE FUNCTION public.rotas_analise(p_pais_origem text DEFAULT 'Todos', p_porto_origem text DEFAULT 'Todos', p_pais_destino text DEFAULT 'Todos', p_porto_destino text DEFAULT 'Todos', p_rota text DEFAULT 'Todos', p_data_inicial date DEFAULT NULL, p_data_final date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'analitico'
AS $f$
DECLARE r jsonb;
BEGIN
  IF p_data_inicial IS NULL AND p_data_final IS NULL THEN
    RETURN public.rotas_analise_padrao(p_pais_origem, p_porto_origem, p_pais_destino, p_porto_destino, p_rota);
  END IF;
  WITH base AS MATERIALIZED (
    SELECT oferta, cliente, rota, coloader, agente, motivo, apr, rep, ema FROM analitico.mv_rota_dt
    WHERE produto = ANY (public.produtos_do_usuario())
      AND (p_pais_origem = 'Todos' OR pais_origem = p_pais_origem)
      AND (p_porto_origem = 'Todos' OR porto_origem = p_porto_origem)
      AND (p_pais_destino = 'Todos' OR pais_destino = p_pais_destino)
      AND (p_porto_destino = 'Todos' OR porto_destino = p_porto_destino)
      AND (p_rota = 'Todos' OR rota = p_rota)
      AND (p_data_inicial IS NULL OR data_abertura >= p_data_inicial)
      AND (p_data_final IS NULL OR data_abertura <= p_data_final)
  ),
  ind AS (SELECT count(*)::bigint rotas, count(DISTINCT nullif(btrim(coalesce(oferta,'')),''))::bigint ofertas,
            count(DISTINCT cliente)::bigint clientes, count(DISTINCT rota)::bigint rotas_distintas, count(DISTINCT coloader)::bigint coloaders,
            coalesce(sum(apr),0)::bigint aprovadas, coalesce(sum(rep),0)::bigint reprovadas, coalesce(sum(ema),0)::bigint em_analise FROM base),
  col AS (SELECT coloader item, count(*)::bigint rotas, sum(apr)::bigint aprovadas, sum(rep)::bigint reprovadas, sum(ema)::bigint em_analise FROM base GROUP BY 1),
  cli AS (SELECT cliente item, count(*)::bigint rotas, sum(apr)::bigint aprovadas, sum(rep)::bigint reprovadas, sum(ema)::bigint em_analise FROM base GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10),
  age AS (SELECT agente item, count(*)::bigint rotas, sum(apr)::bigint aprovadas, sum(rep)::bigint reprovadas, sum(ema)::bigint em_analise FROM base GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10),
  mot AS (SELECT motivo, count(*)::bigint reprovadas FROM base WHERE rep = 1 GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10),
  cc AS (SELECT cliente, coloader, count(*)::bigint rotas, sum(apr)::bigint aprovadas, sum(rep)::bigint reprovadas, sum(ema)::bigint em_analise FROM base GROUP BY 1,2 ORDER BY 5 DESC, 3 DESC, 1, 2 LIMIT 10),
  media AS (SELECT coalesce(sum(aprovadas),0)::bigint aprovadas, coalesce(sum(reprovadas),0)::bigint reprovadas
            FROM analitico.mv_cliente_media_geral WHERE produto = ANY (public.produtos_do_usuario()))
  SELECT jsonb_build_object(
    'indicadores', (SELECT to_jsonb(ind) FROM ind),
    'mediaAprovadas', (SELECT aprovadas FROM media),
    'mediaReprovadas', (SELECT reprovadas FROM media),
    'coloaders', COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.rotas DESC, c.item) FROM col c), '[]'::jsonb),
    'clientes', COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.rotas DESC, c.item) FROM cli c), '[]'::jsonb),
    'agentes', COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.rotas DESC, a.item) FROM age a), '[]'::jsonb),
    'motivosTotal', (SELECT reprovadas FROM ind),
    'motivos', COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.reprovadas DESC, m.motivo) FROM mot m), '[]'::jsonb),
    'clienteColoader', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.reprovadas DESC, x.rotas DESC, x.cliente, x.coloader) FROM cc x), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $f$;

GRANT EXECUTE ON FUNCTION public.agentes_analise(text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotas_analise(text,text,text,text,text,date,date) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.agentes_analise(text, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rotas_analise(text,text,text,text,text,date,date) FROM anon;
ALTER FUNCTION public.agentes_analise_padrao(text) SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.atualizar_analises_periodo()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'analitico'
AS $f$ BEGIN
  REFRESH MATERIALIZED VIEW analitico.mv_agente_dt;
  REFRESH MATERIALIZED VIEW analitico.mv_rota_dt;
END $f$;

NOTIFY pgrst, 'reload schema';