CREATE MATERIALIZED VIEW analitico.mv_qualidade_resumo_per AS
WITH b AS (
  SELECT o.*, extract(year from o.data_abertura)::integer AS ano_f, extract(month from o.data_abertura)::integer AS mes_f
  FROM public.ofertas o WHERE o.produto IS NOT NULL
), c AS (
  SELECT o.produto, o.ano_f, o.mes_f, count(*) AS linhas_base,
 count(*) FILTER (WHERE btrim(COALESCE(o.cliente,''))='') AS sem_cliente,
 count(*) FILTER (WHERE btrim(COALESCE(o.origem,''))='' OR btrim(COALESCE(o.destino,''))='') AS sem_origem_destino,
 count(*) FILTER (WHERE btrim(COALESCE(o.armador,''))='') AS sem_armador,
 count(*) FILTER (WHERE btrim(COALESCE(o.agente,''))='') AS sem_agente,
 count(*) FILTER (WHERE btrim(COALESCE(o.analise,''))='') AS sem_analise,
 count(*) FILTER (WHERE o.analise='Reprovado' AND btrim(COALESCE(o.motivo,''))='') AS reprovadas_sem_motivo,
 count(*) FILTER (WHERE o.data_abertura IS NULL) AS sem_data_abertura,
 count(*) FILTER (WHERE o.data_abertura IS NOT NULL AND o.data_conclusao IS NOT NULL AND o.data_conclusao < o.data_abertura) AS conclusao_anterior,
 count(*) FILTER (WHERE btrim(COALESCE(o.cliente,''))<>'') AS cliente_preenchido,
 count(*) FILTER (WHERE btrim(COALESCE(o.origem,''))<>'') AS origem_preenchida,
 count(*) FILTER (WHERE btrim(COALESCE(o.destino,''))<>'') AS destino_preenchido,
 count(*) FILTER (WHERE btrim(COALESCE(o.armador,''))<>'') AS armador_preenchido,
 count(*) FILTER (WHERE btrim(COALESCE(o.agente,''))<>'') AS agente_preenchido,
 count(*) FILTER (WHERE btrim(COALESCE(o.vendedor,''))<>'') AS vendedor_preenchido,
 count(*) FILTER (WHERE btrim(COALESCE(o.pricing,''))<>'') AS pricing_preenchido,
 count(*) FILTER (WHERE btrim(COALESCE(o.analise,''))<>'') AS analise_preenchida,
 count(*) FILTER (WHERE btrim(COALESCE(o.motivo,''))<>'') AS motivo_preenchido,
 count(*) FILTER (WHERE btrim(COALESCE(o.modalidade,''))<>'') AS modalidade_preenchida,
 count(*) FILTER (WHERE btrim(COALESCE(o.incoterm,''))<>'') AS incoterm_preenchido,
 count(*) FILTER (WHERE o.data_abertura IS NOT NULL) AS data_abertura_preenchida
  FROM b o GROUP BY o.produto, o.ano_f, o.mes_f
), d AS (
  SELECT produto, ano_f, mes_f, COALESCE(sum(qtd-1),0)::bigint AS registros_duplicados
  FROM (SELECT produto, ano_f, mes_f, oferta, revisao, count(*) qtd FROM b
        GROUP BY produto, ano_f, mes_f, oferta, revisao HAVING count(*)>1) x
  GROUP BY produto, ano_f, mes_f
)
SELECT c.*, COALESCE(d.registros_duplicados,0)::bigint AS registros_duplicados
FROM c LEFT JOIN d ON d.produto=c.produto AND d.ano_f IS NOT DISTINCT FROM c.ano_f AND d.mes_f IS NOT DISTINCT FROM c.mes_f;
CREATE INDEX mv_qualidade_resumo_per_idx ON analitico.mv_qualidade_resumo_per (produto, ano_f, mes_f);
REVOKE ALL ON analitico.mv_qualidade_resumo_per FROM public, anon, authenticated;
CREATE OR REPLACE FUNCTION public.qualidade_dados_analise_periodo_calc(p_anos integer[] DEFAULT NULL, p_meses integer[] DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'analitico'
AS $function$
WITH q AS (
  SELECT sum(linhas_base) linhas_base, sum(sem_cliente) sem_cliente,
    sum(sem_origem_destino) sem_origem_destino, sum(sem_armador) sem_armador,
    sum(sem_agente) sem_agente, sum(sem_analise) sem_analise,
    sum(reprovadas_sem_motivo) reprovadas_sem_motivo, sum(sem_data_abertura) sem_data_abertura,
    sum(conclusao_anterior) conclusao_anterior, sum(registros_duplicados) registros_duplicados,
    sum(cliente_preenchido) cliente_preenchido, sum(origem_preenchida) origem_preenchida,
    sum(destino_preenchido) destino_preenchido, sum(armador_preenchido) armador_preenchido,
    sum(agente_preenchido) agente_preenchido, sum(vendedor_preenchido) vendedor_preenchido,
    sum(pricing_preenchido) pricing_preenchido, sum(analise_preenchida) analise_preenchida,
    sum(motivo_preenchido) motivo_preenchido, sum(modalidade_preenchida) modalidade_preenchida,
    sum(incoterm_preenchido) incoterm_preenchido, sum(data_abertura_preenchida) data_abertura_preenchida
  FROM analitico.mv_qualidade_resumo_per
  WHERE produto = ANY (public.produtos_do_usuario())
    AND (coalesce(cardinality(p_anos),0)=0 OR ano_f = ANY(p_anos))
    AND (coalesce(cardinality(p_meses),0)=0 OR mes_f = ANY(p_meses))
)
SELECT jsonb_build_object(
  'linhas_base', coalesce((SELECT linhas_base FROM q), 0),
  'indicadores', coalesce((
    SELECT jsonb_agg(x ORDER BY ord) FROM (
      SELECT 1 AS ord, jsonb_build_object('indicador', 'Registros duplicados (oferta + revisão)', 'quantidade', registros_duplicados, 'impacto', 'Pode inflar contagens e distorcer conversão') AS x FROM q
      UNION ALL SELECT 2, jsonb_build_object('indicador', 'Sem cliente informado', 'quantidade', sem_cliente, 'impacto', 'Análises por cliente ficam incompletas') FROM q
      UNION ALL SELECT 3, jsonb_build_object('indicador', 'Sem origem ou destino', 'quantidade', sem_origem_destino, 'impacto', 'Rota analítica fica como Não informado') FROM q
      UNION ALL SELECT 4, jsonb_build_object('indicador', 'Sem coloader/armador', 'quantidade', sem_armador, 'impacto', 'Rankings de coloader perdem representatividade') FROM q
      UNION ALL SELECT 5, jsonb_build_object('indicador', 'Sem agente', 'quantidade', sem_agente, 'impacto', 'Rankings de agente perdem representatividade') FROM q
      UNION ALL SELECT 6, jsonb_build_object('indicador', 'Sem status de análise', 'quantidade', sem_analise, 'impacto', 'Não entra em aprovadas, reprovadas ou em análise') FROM q
      UNION ALL SELECT 7, jsonb_build_object('indicador', 'Reprovadas sem motivo', 'quantidade', reprovadas_sem_motivo, 'impacto', 'Impede identificar o principal motivo de perda') FROM q
      UNION ALL SELECT 8, jsonb_build_object('indicador', 'Sem data de abertura', 'quantidade', sem_data_abertura, 'impacto', 'Séries temporais e tempo de resposta ficam incompletos') FROM q
      UNION ALL SELECT 9, jsonb_build_object('indicador', 'Conclusão anterior à abertura', 'quantidade', conclusao_anterior, 'impacto', 'Indica inconsistência de datas na origem') FROM q
    ) i
  ), '[]'::jsonb),
  'campos', coalesce((
    SELECT jsonb_agg(x ORDER BY ord) FROM (
      SELECT 1 AS ord, jsonb_build_object('campo', 'Cliente', 'preenchidos', cliente_preenchido) AS x FROM q
      UNION ALL SELECT 2, jsonb_build_object('campo', 'Origem', 'preenchidos', origem_preenchida) FROM q
      UNION ALL SELECT 3, jsonb_build_object('campo', 'Destino', 'preenchidos', destino_preenchido) FROM q
      UNION ALL SELECT 4, jsonb_build_object('campo', 'Armador / Coloader', 'preenchidos', armador_preenchido) FROM q
      UNION ALL SELECT 5, jsonb_build_object('campo', 'Agente', 'preenchidos', agente_preenchido) FROM q
      UNION ALL SELECT 6, jsonb_build_object('campo', 'Vendedor', 'preenchidos', vendedor_preenchido) FROM q
      UNION ALL SELECT 7, jsonb_build_object('campo', 'Analista de Pricing', 'preenchidos', pricing_preenchido) FROM q
      UNION ALL SELECT 8, jsonb_build_object('campo', 'Análise', 'preenchidos', analise_preenchida) FROM q
      UNION ALL SELECT 9, jsonb_build_object('campo', 'Motivo', 'preenchidos', motivo_preenchido) FROM q
      UNION ALL SELECT 10, jsonb_build_object('campo', 'Modalidade', 'preenchidos', modalidade_preenchida) FROM q
      UNION ALL SELECT 11, jsonb_build_object('campo', 'Incoterm', 'preenchidos', incoterm_preenchido) FROM q
      UNION ALL SELECT 12, jsonb_build_object('campo', 'Data de abertura', 'preenchidos', data_abertura_preenchida) FROM q
    ) c
  ), '[]'::jsonb)
);
$function$;
CREATE OR REPLACE FUNCTION public.atualizar_analises_periodo()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'analitico'
AS $function$ BEGIN
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
END $function$;