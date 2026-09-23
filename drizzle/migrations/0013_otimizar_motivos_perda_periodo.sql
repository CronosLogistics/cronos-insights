CREATE MATERIALIZED VIEW analitico.mv_motivo_per_ind AS
WITH reprovadas AS (
  SELECT produto, motivo_perda_analitico AS motivo, ano_f, mes_f, count(*)::bigint AS reprovacoes
  FROM analitico.mv_ofertas_periodo
  WHERE flag_reprovada = 1
  GROUP BY 1,2,3,4
)
SELECT * FROM reprovadas
UNION ALL
SELECT produto, 'Todos'::text AS motivo, ano_f, mes_f, sum(reprovacoes)::bigint
FROM reprovadas GROUP BY 1,3,4;
CREATE INDEX mv_motivo_per_ind_idx ON analitico.mv_motivo_per_ind (produto, motivo, ano_f, mes_f);

CREATE MATERIALIZED VIEW analitico.mv_motivo_per_rota AS
WITH reprovadas AS (
  SELECT produto, motivo_perda_analitico AS motivo, ano_f, mes_f, rota_analitica AS item, count(*)::bigint AS reprovacoes
  FROM analitico.mv_ofertas_periodo WHERE flag_reprovada = 1 GROUP BY 1,2,3,4,5
)
SELECT * FROM reprovadas
UNION ALL
SELECT produto, 'Todos'::text, ano_f, mes_f, item, sum(reprovacoes)::bigint FROM reprovadas GROUP BY 1,3,4,5;
CREATE INDEX mv_motivo_per_rota_idx ON analitico.mv_motivo_per_rota (produto, motivo, ano_f, mes_f);

CREATE MATERIALIZED VIEW analitico.mv_motivo_per_cliente AS
WITH reprovadas AS (
  SELECT produto, motivo_perda_analitico AS motivo, ano_f, mes_f, cliente_analitico AS item, count(*)::bigint AS reprovacoes
  FROM analitico.mv_ofertas_periodo WHERE flag_reprovada = 1 GROUP BY 1,2,3,4,5
)
SELECT * FROM reprovadas
UNION ALL
SELECT produto, 'Todos'::text, ano_f, mes_f, item, sum(reprovacoes)::bigint FROM reprovadas GROUP BY 1,3,4,5;
CREATE INDEX mv_motivo_per_cliente_idx ON analitico.mv_motivo_per_cliente (produto, motivo, ano_f, mes_f);

CREATE MATERIALIZED VIEW analitico.mv_motivo_per_coloader AS
WITH reprovadas AS (
  SELECT produto, motivo_perda_analitico AS motivo, ano_f, mes_f, coloader_analitico AS item, count(*)::bigint AS reprovacoes
  FROM analitico.mv_ofertas_periodo WHERE flag_reprovada = 1 GROUP BY 1,2,3,4,5
)
SELECT * FROM reprovadas
UNION ALL
SELECT produto, 'Todos'::text, ano_f, mes_f, item, sum(reprovacoes)::bigint FROM reprovadas GROUP BY 1,3,4,5;
CREATE INDEX mv_motivo_per_coloader_idx ON analitico.mv_motivo_per_coloader (produto, motivo, ano_f, mes_f);

CREATE MATERIALIZED VIEW analitico.mv_motivo_per_agente AS
WITH reprovadas AS (
  SELECT produto, motivo_perda_analitico AS motivo, ano_f, mes_f, agente_analitico AS item, count(*)::bigint AS reprovacoes
  FROM analitico.mv_ofertas_periodo WHERE flag_reprovada = 1 GROUP BY 1,2,3,4,5
)
SELECT * FROM reprovadas
UNION ALL
SELECT produto, 'Todos'::text, ano_f, mes_f, item, sum(reprovacoes)::bigint FROM reprovadas GROUP BY 1,3,4,5;
CREATE INDEX mv_motivo_per_agente_idx ON analitico.mv_motivo_per_agente (produto, motivo, ano_f, mes_f);

CREATE MATERIALIZED VIEW analitico.mv_motivo_per_rota_cliente AS
WITH reprovadas AS (
  SELECT produto, motivo_perda_analitico AS motivo, ano_f, mes_f, rota_analitica AS rota, cliente_analitico AS cliente, count(*)::bigint AS reprovacoes
  FROM analitico.mv_ofertas_periodo WHERE flag_reprovada = 1 GROUP BY 1,2,3,4,5,6
)
SELECT * FROM reprovadas
UNION ALL
SELECT produto, 'Todos'::text, ano_f, mes_f, rota, cliente, sum(reprovacoes)::bigint FROM reprovadas GROUP BY 1,3,4,5,6;
CREATE INDEX mv_motivo_per_rota_cliente_idx ON analitico.mv_motivo_per_rota_cliente (produto, motivo, ano_f, mes_f);

CREATE MATERIALIZED VIEW analitico.mv_motivo_per_mes AS
WITH reprovadas AS (
  SELECT produto, motivo_perda_analitico AS motivo, ano_f, mes_f, mes_ref AS mes, count(*)::bigint AS reprovacoes
  FROM analitico.mv_ofertas_periodo WHERE flag_reprovada = 1 AND mes_ref IS NOT NULL GROUP BY 1,2,3,4,5
)
SELECT * FROM reprovadas
UNION ALL
SELECT produto, 'Todos'::text, ano_f, mes_f, mes, sum(reprovacoes)::bigint FROM reprovadas GROUP BY 1,3,4,5;
CREATE INDEX mv_motivo_per_mes_idx ON analitico.mv_motivo_per_mes (produto, motivo, ano_f, mes_f);

REVOKE ALL ON analitico.mv_motivo_per_ind, analitico.mv_motivo_per_rota,
  analitico.mv_motivo_per_cliente, analitico.mv_motivo_per_coloader,
  analitico.mv_motivo_per_agente, analitico.mv_motivo_per_rota_cliente,
  analitico.mv_motivo_per_mes FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.motivos_perda_analise_periodo_calc(
  p_motivo text DEFAULT 'Todos', p_anos integer[] DEFAULT NULL, p_meses integer[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, analitico
SET work_mem = '64MB'
AS $$
WITH prods AS (SELECT public.produtos_do_usuario() AS p),
alvo AS (SELECT coalesce(nullif(btrim(p_motivo), ''), '(Não informado)') AS motivo),
ind AS (
  SELECT coalesce(sum(m.reprovacoes),0)::bigint AS reprovacoes
  FROM analitico.mv_motivo_per_ind m, prods, alvo
  WHERE m.produto=any(prods.p) AND m.motivo=alvo.motivo
    AND (coalesce(cardinality(p_anos),0)=0 OR m.ano_f=any(p_anos))
    AND (coalesce(cardinality(p_meses),0)=0 OR m.mes_f=any(p_meses))
),
tot AS (
  SELECT coalesce(sum(m.reprovacoes),0)::bigint AS reprovacoes
  FROM analitico.mv_motivo_per_ind m, prods
  WHERE m.produto=any(prods.p) AND m.motivo='Todos'
    AND (coalesce(cardinality(p_anos),0)=0 OR m.ano_f=any(p_anos))
    AND (coalesce(cardinality(p_meses),0)=0 OR m.mes_f=any(p_meses))
),
rot AS (
  SELECT m.item, sum(m.reprovacoes)::bigint AS reprovacoes FROM analitico.mv_motivo_per_rota m,prods,alvo
  WHERE m.produto=any(prods.p) AND m.motivo=alvo.motivo AND (coalesce(cardinality(p_anos),0)=0 OR m.ano_f=any(p_anos)) AND (coalesce(cardinality(p_meses),0)=0 OR m.mes_f=any(p_meses)) GROUP BY m.item
),
cli AS (
  SELECT m.item, sum(m.reprovacoes)::bigint AS reprovacoes FROM analitico.mv_motivo_per_cliente m,prods,alvo
  WHERE m.produto=any(prods.p) AND m.motivo=alvo.motivo AND (coalesce(cardinality(p_anos),0)=0 OR m.ano_f=any(p_anos)) AND (coalesce(cardinality(p_meses),0)=0 OR m.mes_f=any(p_meses)) GROUP BY m.item
),
col AS (
  SELECT m.item, sum(m.reprovacoes)::bigint AS reprovacoes FROM analitico.mv_motivo_per_coloader m,prods,alvo
  WHERE m.produto=any(prods.p) AND m.motivo=alvo.motivo AND (coalesce(cardinality(p_anos),0)=0 OR m.ano_f=any(p_anos)) AND (coalesce(cardinality(p_meses),0)=0 OR m.mes_f=any(p_meses)) GROUP BY m.item
),
age AS (
  SELECT m.item, sum(m.reprovacoes)::bigint AS reprovacoes FROM analitico.mv_motivo_per_agente m,prods,alvo
  WHERE m.produto=any(prods.p) AND m.motivo=alvo.motivo AND (coalesce(cardinality(p_anos),0)=0 OR m.ano_f=any(p_anos)) AND (coalesce(cardinality(p_meses),0)=0 OR m.mes_f=any(p_meses)) GROUP BY m.item
),
rc AS (
  SELECT m.rota,m.cliente,sum(m.reprovacoes)::bigint AS reprovacoes FROM analitico.mv_motivo_per_rota_cliente m,prods,alvo
  WHERE m.produto=any(prods.p) AND m.motivo=alvo.motivo AND (coalesce(cardinality(p_anos),0)=0 OR m.ano_f=any(p_anos)) AND (coalesce(cardinality(p_meses),0)=0 OR m.mes_f=any(p_meses)) GROUP BY m.rota,m.cliente
),
mes AS (
  SELECT m.mes,sum(m.reprovacoes)::bigint AS reprovacoes FROM analitico.mv_motivo_per_mes m,prods,alvo
  WHERE m.produto=any(prods.p) AND m.motivo=alvo.motivo AND (coalesce(cardinality(p_anos),0)=0 OR m.ano_f=any(p_anos)) AND (coalesce(cardinality(p_meses),0)=0 OR m.mes_f=any(p_meses)) GROUP BY m.mes
),
mes_tot AS (
  SELECT m.mes,sum(m.reprovacoes)::bigint AS reprovacoes FROM analitico.mv_motivo_per_mes m,prods
  WHERE m.produto=any(prods.p) AND m.motivo='Todos' AND (coalesce(cardinality(p_anos),0)=0 OR m.ano_f=any(p_anos)) AND (coalesce(cardinality(p_meses),0)=0 OR m.mes_f=any(p_meses)) GROUP BY m.mes
)
SELECT jsonb_build_object(
 'indicadores',jsonb_build_object('reprovacoes',(SELECT reprovacoes FROM ind),'pct_reprovacoes',CASE WHEN (SELECT reprovacoes FROM tot)>0 THEN (SELECT reprovacoes FROM ind)::numeric/(SELECT reprovacoes FROM tot) ELSE 0 END,'rotas',(SELECT count(*) FROM rot),'clientes',(SELECT count(*) FROM cli),'coloaders',(SELECT count(*) FROM col),'agentes',(SELECT count(*) FROM age),'meses',(SELECT count(*) FROM mes),'amostra',(SELECT reprovacoes FROM ind)),
 'perfil',jsonb_build_object('principal_rota',coalesce((SELECT item FROM rot ORDER BY reprovacoes DESC,item LIMIT 1),'-'),'principal_cliente',coalesce((SELECT item FROM cli ORDER BY reprovacoes DESC,item LIMIT 1),'-'),'principal_coloader',coalesce((SELECT item FROM col ORDER BY reprovacoes DESC,item LIMIT 1),'-'),'principal_agente',coalesce((SELECT item FROM age ORDER BY reprovacoes DESC,item LIMIT 1),'-')),
 'motivo_rota',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.reprovacoes DESC,x.item) FROM (SELECT item,reprovacoes,CASE WHEN (SELECT reprovacoes FROM ind)>0 THEN reprovacoes::numeric/(SELECT reprovacoes FROM ind) ELSE 0 END AS pct_motivo FROM rot ORDER BY reprovacoes DESC,item LIMIT 10)x),'[]'::jsonb),
 'motivo_cliente',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.reprovacoes DESC,x.item) FROM (SELECT item,reprovacoes,CASE WHEN (SELECT reprovacoes FROM ind)>0 THEN reprovacoes::numeric/(SELECT reprovacoes FROM ind) ELSE 0 END AS pct_motivo FROM cli ORDER BY reprovacoes DESC,item LIMIT 10)x),'[]'::jsonb),
 'coloaders',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.reprovacoes DESC,x.item) FROM (SELECT item,reprovacoes,CASE WHEN (SELECT reprovacoes FROM ind)>0 THEN reprovacoes::numeric/(SELECT reprovacoes FROM ind) ELSE 0 END AS pct_motivo FROM col ORDER BY reprovacoes DESC,item LIMIT 10)x),'[]'::jsonb),
 'agentes',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.reprovacoes DESC,x.item) FROM (SELECT item,reprovacoes,CASE WHEN (SELECT reprovacoes FROM ind)>0 THEN reprovacoes::numeric/(SELECT reprovacoes FROM ind) ELSE 0 END AS pct_motivo FROM age ORDER BY reprovacoes DESC,item LIMIT 10)x),'[]'::jsonb),
 'rota_cliente',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.reprovacoes DESC,x.rota,x.cliente) FROM (SELECT rota,cliente,reprovacoes FROM rc ORDER BY reprovacoes DESC,rota,cliente LIMIT 10)x),'[]'::jsonb),
 'evolucao_mensal',coalesce((SELECT jsonb_agg(jsonb_build_object('mes',m.mes,'reprovacoes',m.reprovacoes,'pct_mes',CASE WHEN coalesce(t.reprovacoes,0)>0 THEN m.reprovacoes::numeric/t.reprovacoes ELSE 0 END) ORDER BY m.mes) FROM mes m LEFT JOIN mes_tot t ON t.mes=m.mes),'[]'::jsonb)
);
$$;
REVOKE ALL ON FUNCTION public.motivos_perda_analise_periodo_calc(text,integer[],integer[]) FROM public, anon, authenticated;

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
END $$;

NOTIFY pgrst, 'reload schema';