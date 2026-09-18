CREATE MATERIALIZED VIEW analitico.mv_qualidade_resumo AS
WITH contagens AS (
  SELECT
    o.produto,
    count(*)::bigint AS linhas_base,
    count(*) FILTER (WHERE btrim(coalesce(o.cliente, '')) = '')::bigint AS sem_cliente,
    count(*) FILTER (WHERE btrim(coalesce(o.origem, '')) = '' OR btrim(coalesce(o.destino, '')) = '')::bigint AS sem_origem_destino,
    count(*) FILTER (WHERE btrim(coalesce(o.armador, '')) = '')::bigint AS sem_armador,
    count(*) FILTER (WHERE btrim(coalesce(o.agente, '')) = '')::bigint AS sem_agente,
    count(*) FILTER (WHERE btrim(coalesce(o.analise, '')) = '')::bigint AS sem_analise,
    count(*) FILTER (WHERE o.analise = 'Reprovado' AND btrim(coalesce(o.motivo, '')) = '')::bigint AS reprovadas_sem_motivo,
    count(*) FILTER (WHERE o.data_abertura IS NULL)::bigint AS sem_data_abertura,
    count(*) FILTER (WHERE o.data_abertura IS NOT NULL AND o.data_conclusao IS NOT NULL AND o.data_conclusao < o.data_abertura)::bigint AS conclusao_anterior,
    count(*) FILTER (WHERE btrim(coalesce(o.cliente, '')) <> '')::bigint AS cliente_preenchido,
    count(*) FILTER (WHERE btrim(coalesce(o.origem, '')) <> '')::bigint AS origem_preenchida,
    count(*) FILTER (WHERE btrim(coalesce(o.destino, '')) <> '')::bigint AS destino_preenchido,
    count(*) FILTER (WHERE btrim(coalesce(o.armador, '')) <> '')::bigint AS armador_preenchido,
    count(*) FILTER (WHERE btrim(coalesce(o.agente, '')) <> '')::bigint AS agente_preenchido,
    count(*) FILTER (WHERE btrim(coalesce(o.vendedor, '')) <> '')::bigint AS vendedor_preenchido,
    count(*) FILTER (WHERE btrim(coalesce(o.pricing, '')) <> '')::bigint AS pricing_preenchido,
    count(*) FILTER (WHERE btrim(coalesce(o.analise, '')) <> '')::bigint AS analise_preenchida,
    count(*) FILTER (WHERE btrim(coalesce(o.motivo, '')) <> '')::bigint AS motivo_preenchido,
    count(*) FILTER (WHERE btrim(coalesce(o.modalidade, '')) <> '')::bigint AS modalidade_preenchida,
    count(*) FILTER (WHERE btrim(coalesce(o.incoterm, '')) <> '')::bigint AS incoterm_preenchido,
    count(*) FILTER (WHERE o.data_abertura IS NOT NULL)::bigint AS data_abertura_preenchida
  FROM public.ofertas o
  WHERE o.produto IS NOT NULL
  GROUP BY o.produto
), duplicados AS (
  SELECT produto, coalesce(sum(qtd - 1), 0)::bigint AS registros_duplicados
  FROM (
    SELECT produto, oferta, revisao, count(*)::bigint AS qtd
    FROM public.ofertas
    WHERE produto IS NOT NULL
    GROUP BY produto, oferta, revisao
    HAVING count(*) > 1
  ) d
  GROUP BY produto
)
SELECT c.*, coalesce(d.registros_duplicados, 0)::bigint AS registros_duplicados
FROM contagens c
LEFT JOIN duplicados d USING (produto);

CREATE UNIQUE INDEX mv_qualidade_resumo_produto_idx
  ON analitico.mv_qualidade_resumo (produto);

REVOKE ALL ON analitico.mv_qualidade_resumo FROM PUBLIC, anon, authenticated;
GRANT ALL ON analitico.mv_qualidade_resumo TO service_role;

CREATE OR REPLACE FUNCTION public.qualidade_dados_analise()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, analitico
AS $$
WITH q AS (
  SELECT *
  FROM analitico.mv_qualidade_resumo
  WHERE produto = public.produto_do_usuario()
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
      UNION ALL SELECT 7, jsonb_build_object('campo', 'Analista Pricing', 'preenchidos', pricing_preenchido) FROM q
      UNION ALL SELECT 8, jsonb_build_object('campo', 'Análise', 'preenchidos', analise_preenchida) FROM q
      UNION ALL SELECT 9, jsonb_build_object('campo', 'Motivo', 'preenchidos', motivo_preenchido) FROM q
      UNION ALL SELECT 10, jsonb_build_object('campo', 'Modalidade', 'preenchidos', modalidade_preenchida) FROM q
      UNION ALL SELECT 11, jsonb_build_object('campo', 'Incoterm', 'preenchidos', incoterm_preenchido) FROM q
      UNION ALL SELECT 12, jsonb_build_object('campo', 'Data de abertura', 'preenchidos', data_abertura_preenchida) FROM q
    ) c
  ), '[]'::jsonb)
);
$$;

REVOKE ALL ON FUNCTION public.qualidade_dados_analise() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.qualidade_dados_analise() TO authenticated;

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
  refresh materialized view analitico.mv_qualidade_resumo;
end;
$function$;

REVOKE ALL ON FUNCTION public.atualizar_analises() FROM PUBLIC, anon, authenticated;