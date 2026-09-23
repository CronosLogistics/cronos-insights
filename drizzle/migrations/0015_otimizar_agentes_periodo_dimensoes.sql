CREATE MATERIALIZED VIEW analitico.mv_agente_per_ind AS
SELECT produto, agente_analitico AS agente, ano_f, mes_f,
       count(*)::bigint AS rotas,
       coalesce(sum(flag_aprovada), 0)::bigint AS aprovadas,
       coalesce(sum(flag_reprovada), 0)::bigint AS reprovadas,
       coalesce(sum(flag_em_analise), 0)::bigint AS em_analise
FROM analitico.mv_ofertas_periodo
GROUP BY 1,2,3,4;
CREATE INDEX mv_agente_per_ind_idx ON analitico.mv_agente_per_ind (produto, agente, ano_f, mes_f);

CREATE MATERIALIZED VIEW analitico.mv_agente_per_oferta AS
SELECT DISTINCT produto, agente_analitico AS agente, ano_f, mes_f,
       nullif(btrim(coalesce(oferta, '')), '') AS oferta
FROM analitico.mv_ofertas_periodo
WHERE nullif(btrim(coalesce(oferta, '')), '') IS NOT NULL;
CREATE INDEX mv_agente_per_oferta_idx ON analitico.mv_agente_per_oferta (produto, agente, ano_f, mes_f);

CREATE MATERIALIZED VIEW analitico.mv_agente_per_cliente AS
SELECT produto, agente_analitico AS agente, ano_f, mes_f, cliente_analitico AS item,
       count(*)::bigint AS rotas,
       coalesce(sum(flag_aprovada), 0)::bigint AS aprovadas,
       coalesce(sum(flag_reprovada), 0)::bigint AS reprovadas,
       coalesce(sum(flag_em_analise), 0)::bigint AS em_analise
FROM analitico.mv_ofertas_periodo
GROUP BY 1,2,3,4,5;
CREATE INDEX mv_agente_per_cliente_idx ON analitico.mv_agente_per_cliente (produto, agente, ano_f, mes_f);

CREATE MATERIALIZED VIEW analitico.mv_agente_per_rota AS
SELECT produto, agente_analitico AS agente, ano_f, mes_f, rota_analitica AS item,
       count(*)::bigint AS rotas,
       coalesce(sum(flag_aprovada), 0)::bigint AS aprovadas,
       coalesce(sum(flag_reprovada), 0)::bigint AS reprovadas,
       coalesce(sum(flag_em_analise), 0)::bigint AS em_analise
FROM analitico.mv_ofertas_periodo
GROUP BY 1,2,3,4,5;
CREATE INDEX mv_agente_per_rota_idx ON analitico.mv_agente_per_rota (produto, agente, ano_f, mes_f);

CREATE MATERIALIZED VIEW analitico.mv_agente_per_coloader AS
SELECT produto, agente_analitico AS agente, ano_f, mes_f, coloader_analitico AS item,
       count(*)::bigint AS rotas,
       coalesce(sum(flag_aprovada), 0)::bigint AS aprovadas,
       coalesce(sum(flag_reprovada), 0)::bigint AS reprovadas,
       coalesce(sum(flag_em_analise), 0)::bigint AS em_analise
FROM analitico.mv_ofertas_periodo
GROUP BY 1,2,3,4,5;
CREATE INDEX mv_agente_per_coloader_idx ON analitico.mv_agente_per_coloader (produto, agente, ano_f, mes_f);

CREATE MATERIALIZED VIEW analitico.mv_agente_per_motivo AS
SELECT produto, agente_analitico AS agente, ano_f, mes_f, motivo_perda_analitico AS motivo,
       count(*)::bigint AS reprovadas
FROM analitico.mv_ofertas_periodo
WHERE flag_reprovada = 1
GROUP BY 1,2,3,4,5;
CREATE INDEX mv_agente_per_motivo_idx ON analitico.mv_agente_per_motivo (produto, agente, ano_f, mes_f);

CREATE MATERIALIZED VIEW analitico.mv_agente_per_rota_coloader AS
SELECT produto, agente_analitico AS agente, ano_f, mes_f,
       rota_analitica AS rota, coloader_analitico AS coloader,
       count(*)::bigint AS rotas,
       coalesce(sum(flag_aprovada), 0)::bigint AS aprovadas,
       coalesce(sum(flag_reprovada), 0)::bigint AS reprovadas,
       coalesce(sum(flag_em_analise), 0)::bigint AS em_analise
FROM analitico.mv_ofertas_periodo
GROUP BY 1,2,3,4,5,6;
CREATE INDEX mv_agente_per_rota_coloader_idx ON analitico.mv_agente_per_rota_coloader (produto, agente, ano_f, mes_f);

REVOKE ALL ON analitico.mv_agente_per_ind, analitico.mv_agente_per_oferta,
  analitico.mv_agente_per_cliente, analitico.mv_agente_per_rota,
  analitico.mv_agente_per_coloader, analitico.mv_agente_per_motivo,
  analitico.mv_agente_per_rota_coloader FROM public, anon, authenticated;
GRANT ALL ON analitico.mv_agente_per_ind, analitico.mv_agente_per_oferta,
  analitico.mv_agente_per_cliente, analitico.mv_agente_per_rota,
  analitico.mv_agente_per_coloader, analitico.mv_agente_per_motivo,
  analitico.mv_agente_per_rota_coloader TO service_role;

CREATE OR REPLACE FUNCTION public.agentes_analise_periodo_calc(
  p_agente text DEFAULT 'Todos', p_anos integer[] DEFAULT NULL, p_meses integer[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, analitico
SET work_mem = '64MB'
AS $$
WITH prods AS (SELECT public.produtos_do_usuario() AS p),
alvo AS (SELECT coalesce(nullif(regexp_replace(btrim(p_agente), '\s+', ' ', 'g'), ''), '(Não informado)') AS a),
ind AS (
  SELECT coalesce(sum(m.rotas),0)::bigint rotas,
         coalesce(sum(m.aprovadas),0)::bigint aprovadas,
         coalesce(sum(m.reprovadas),0)::bigint reprovadas,
         coalesce(sum(m.em_analise),0)::bigint em_analise
  FROM analitico.mv_agente_per_ind m, prods, alvo
  WHERE m.produto=any(prods.p) AND (p_agente='Todos' OR m.agente=alvo.a)
    AND (coalesce(cardinality(p_anos),0)=0 OR m.ano_f=any(p_anos))
    AND (coalesce(cardinality(p_meses),0)=0 OR m.mes_f=any(p_meses))
),
ofs AS (
  SELECT count(distinct o.oferta)::bigint ofertas
  FROM analitico.mv_agente_per_oferta o, prods, alvo
  WHERE o.produto=any(prods.p) AND (p_agente='Todos' OR o.agente=alvo.a)
    AND (coalesce(cardinality(p_anos),0)=0 OR o.ano_f=any(p_anos))
    AND (coalesce(cardinality(p_meses),0)=0 OR o.mes_f=any(p_meses))
),
cli_all AS (
  SELECT c.item, sum(c.rotas)::bigint rotas, sum(c.aprovadas)::bigint aprovadas,
         sum(c.reprovadas)::bigint reprovadas, sum(c.em_analise)::bigint em_analise
  FROM analitico.mv_agente_per_cliente c, prods, alvo
  WHERE c.produto=any(prods.p) AND (p_agente='Todos' OR c.agente=alvo.a)
    AND (coalesce(cardinality(p_anos),0)=0 OR c.ano_f=any(p_anos))
    AND (coalesce(cardinality(p_meses),0)=0 OR c.mes_f=any(p_meses)) GROUP BY c.item
),
rot_all AS (
  SELECT r.item, sum(r.rotas)::bigint rotas, sum(r.aprovadas)::bigint aprovadas,
         sum(r.reprovadas)::bigint reprovadas, sum(r.em_analise)::bigint em_analise
  FROM analitico.mv_agente_per_rota r, prods, alvo
  WHERE r.produto=any(prods.p) AND (p_agente='Todos' OR r.agente=alvo.a)
    AND (coalesce(cardinality(p_anos),0)=0 OR r.ano_f=any(p_anos))
    AND (coalesce(cardinality(p_meses),0)=0 OR r.mes_f=any(p_meses)) GROUP BY r.item
),
col_all AS (
  SELECT c.item, sum(c.rotas)::bigint rotas, sum(c.aprovadas)::bigint aprovadas,
         sum(c.reprovadas)::bigint reprovadas, sum(c.em_analise)::bigint em_analise
  FROM analitico.mv_agente_per_coloader c, prods, alvo
  WHERE c.produto=any(prods.p) AND (p_agente='Todos' OR c.agente=alvo.a)
    AND (coalesce(cardinality(p_anos),0)=0 OR c.ano_f=any(p_anos))
    AND (coalesce(cardinality(p_meses),0)=0 OR c.mes_f=any(p_meses)) GROUP BY c.item
),
mot_all AS (
  SELECT m.motivo, sum(m.reprovadas)::bigint reprovadas
  FROM analitico.mv_agente_per_motivo m, prods, alvo
  WHERE m.produto=any(prods.p) AND (p_agente='Todos' OR m.agente=alvo.a)
    AND (coalesce(cardinality(p_anos),0)=0 OR m.ano_f=any(p_anos))
    AND (coalesce(cardinality(p_meses),0)=0 OR m.mes_f=any(p_meses)) GROUP BY m.motivo
),
rc_all AS (
  SELECT x.rota, x.coloader, sum(x.rotas)::bigint rotas,
         sum(x.aprovadas)::bigint aprovadas, sum(x.reprovadas)::bigint reprovadas,
         sum(x.em_analise)::bigint em_analise
  FROM analitico.mv_agente_per_rota_coloader x, prods, alvo
  WHERE x.produto=any(prods.p) AND (p_agente='Todos' OR x.agente=alvo.a)
    AND (coalesce(cardinality(p_anos),0)=0 OR x.ano_f=any(p_anos))
    AND (coalesce(cardinality(p_meses),0)=0 OR x.mes_f=any(p_meses)) GROUP BY x.rota,x.coloader
),
indicadores AS (
 SELECT i.rotas, o.ofertas, (SELECT count(*) FROM cli_all)::bigint clientes,
   (SELECT count(*) FROM rot_all)::bigint rotas_distintas,
   (SELECT count(*) FROM col_all)::bigint coloaders,
   i.aprovadas, i.reprovadas, i.em_analise FROM ind i CROSS JOIN ofs o
)
SELECT jsonb_build_object(
 'indicadores',(SELECT to_jsonb(i) FROM indicadores i),
 'mediaAprovadas',coalesce((SELECT sum(m.aprovadas) FROM analitico.mv_cliente_media_geral m,prods WHERE m.produto=any(prods.p)),0),
 'mediaReprovadas',coalesce((SELECT sum(m.reprovadas) FROM analitico.mv_cliente_media_geral m,prods WHERE m.produto=any(prods.p)),0),
 'rotas',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.rotas DESC,x.item) FROM (SELECT * FROM rot_all ORDER BY rotas DESC,item LIMIT 10) x),'[]'::jsonb),
 'coloaders',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.rotas DESC,x.item) FROM (SELECT * FROM col_all ORDER BY rotas DESC,item LIMIT 10) x),'[]'::jsonb),
 'clientes',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.rotas DESC,x.item) FROM (SELECT * FROM cli_all ORDER BY rotas DESC,item LIMIT 10) x),'[]'::jsonb),
 'motivosTotal',(SELECT reprovadas FROM indicadores),
 'motivos',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.reprovadas DESC,x.motivo) FROM (SELECT * FROM mot_all ORDER BY reprovadas DESC,motivo LIMIT 10) x),'[]'::jsonb),
 'rotaColoader',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.reprovadas DESC,x.rotas DESC,x.rota,x.coloader) FROM (SELECT * FROM rc_all ORDER BY reprovadas DESC,rotas DESC,rota,coloader LIMIT 10) x),'[]'::jsonb)
);
$$;
REVOKE ALL ON FUNCTION public.agentes_analise_periodo_calc(text,integer[],integer[]) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.atualizar_analises_periodo()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,analitico AS $$ BEGIN
  REFRESH MATERIALIZED VIEW analitico.mv_agente_dt;
  REFRESH MATERIALIZED VIEW analitico.mv_rota_dt;
  REFRESH MATERIALIZED VIEW analitico.mv_ofertas_periodo;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_per;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_per_oferta;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_per_ind;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_per_cliente;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_per_rota;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_per_coloader;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_per_agente;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_per_motivo;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_per_rota_agente;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_per_ind;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_per_rota;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_per_cliente;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_per_coloader;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_per_agente;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_per_rota_cliente;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_per_mes;
  REFRESH MATERIALIZED VIEW analitico.mv_qualidade_resumo_per;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_per_ind;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_per_oferta;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_per_cliente;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_per_rota;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_per_coloader;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_per_motivo;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_per_rota_coloader;
END $$;

NOTIFY pgrst, 'reload schema';