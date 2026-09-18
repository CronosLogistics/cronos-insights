CREATE OR REPLACE FUNCTION public.qualidade_dados_analise()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
WITH base AS (
  SELECT
    o.oferta,
    o.revisao,
    btrim(coalesce(o.cliente, '')) AS cliente,
    btrim(coalesce(o.origem, '')) AS origem,
    btrim(coalesce(o.destino, '')) AS destino,
    btrim(coalesce(o.armador, '')) AS armador,
    btrim(coalesce(o.agente, '')) AS agente,
    btrim(coalesce(o.vendedor, '')) AS vendedor,
    btrim(coalesce(o.pricing, '')) AS pricing,
    btrim(coalesce(o.analise, '')) AS analise,
    btrim(coalesce(o.motivo, '')) AS motivo,
    btrim(coalesce(o.modalidade, '')) AS modalidade,
    btrim(coalesce(o.incoterm, '')) AS incoterm,
    o.data_abertura,
    o.data_conclusao
  FROM public.ofertas o
  WHERE o.produto IS NOT NULL
), tot AS (
  SELECT count(*)::bigint AS linhas FROM base
), dup AS (
  SELECT coalesce(sum(c - 1), 0)::bigint AS q
  FROM (SELECT count(*) AS c FROM base GROUP BY oferta, revisao HAVING count(*) > 1) d
)
SELECT jsonb_build_object(
  'linhas_base', (SELECT linhas FROM tot),
  'indicadores', (
    SELECT jsonb_agg(x ORDER BY ord) FROM (
      SELECT 1 AS ord, jsonb_build_object('indicador', 'Registros duplicados (oferta + revisão)', 'quantidade', (SELECT q FROM dup), 'impacto', 'Pode inflar contagens e distorcer conversão') AS x
      UNION ALL SELECT 2, jsonb_build_object('indicador', 'Sem cliente informado', 'quantidade', (SELECT count(*) FROM base WHERE cliente = ''), 'impacto', 'Análises por cliente ficam incompletas')
      UNION ALL SELECT 3, jsonb_build_object('indicador', 'Sem origem ou destino', 'quantidade', (SELECT count(*) FROM base WHERE origem = '' OR destino = ''), 'impacto', 'Rota analítica fica como Não informado')
      UNION ALL SELECT 4, jsonb_build_object('indicador', 'Sem coloader/armador', 'quantidade', (SELECT count(*) FROM base WHERE armador = ''), 'impacto', 'Rankings de coloader perdem representatividade')
      UNION ALL SELECT 5, jsonb_build_object('indicador', 'Sem agente', 'quantidade', (SELECT count(*) FROM base WHERE agente = ''), 'impacto', 'Rankings de agente perdem representatividade')
      UNION ALL SELECT 6, jsonb_build_object('indicador', 'Sem status de análise', 'quantidade', (SELECT count(*) FROM base WHERE analise = ''), 'impacto', 'Não entra em aprovadas, reprovadas ou em análise')
      UNION ALL SELECT 7, jsonb_build_object('indicador', 'Reprovadas sem motivo', 'quantidade', (SELECT count(*) FROM base WHERE analise = 'Reprovado' AND motivo = ''), 'impacto', 'Impede identificar o principal motivo de perda')
      UNION ALL SELECT 8, jsonb_build_object('indicador', 'Sem data de abertura', 'quantidade', (SELECT count(*) FROM base WHERE data_abertura IS NULL), 'impacto', 'Séries temporais e tempo de resposta ficam incompletos')
      UNION ALL SELECT 9, jsonb_build_object('indicador', 'Conclusão anterior à abertura', 'quantidade', (SELECT count(*) FROM base WHERE data_abertura IS NOT NULL AND data_conclusao IS NOT NULL AND data_conclusao < data_abertura), 'impacto', 'Indica inconsistência de datas na origem')
    ) i
  ),
  'campos', (
    SELECT jsonb_agg(x ORDER BY ord) FROM (
      SELECT 1 AS ord, jsonb_build_object('campo', 'Cliente', 'preenchidos', (SELECT count(*) FROM base WHERE cliente <> '')) AS x
      UNION ALL SELECT 2, jsonb_build_object('campo', 'Origem', 'preenchidos', (SELECT count(*) FROM base WHERE origem <> ''))
      UNION ALL SELECT 3, jsonb_build_object('campo', 'Destino', 'preenchidos', (SELECT count(*) FROM base WHERE destino <> ''))
      UNION ALL SELECT 4, jsonb_build_object('campo', 'Armador / Coloader', 'preenchidos', (SELECT count(*) FROM base WHERE armador <> ''))
      UNION ALL SELECT 5, jsonb_build_object('campo', 'Agente', 'preenchidos', (SELECT count(*) FROM base WHERE agente <> ''))
      UNION ALL SELECT 6, jsonb_build_object('campo', 'Vendedor', 'preenchidos', (SELECT count(*) FROM base WHERE vendedor <> ''))
      UNION ALL SELECT 7, jsonb_build_object('campo', 'Analista Pricing', 'preenchidos', (SELECT count(*) FROM base WHERE pricing <> ''))
      UNION ALL SELECT 8, jsonb_build_object('campo', 'Análise', 'preenchidos', (SELECT count(*) FROM base WHERE analise <> ''))
      UNION ALL SELECT 9, jsonb_build_object('campo', 'Motivo', 'preenchidos', (SELECT count(*) FROM base WHERE motivo <> ''))
      UNION ALL SELECT 10, jsonb_build_object('campo', 'Modalidade', 'preenchidos', (SELECT count(*) FROM base WHERE modalidade <> ''))
      UNION ALL SELECT 11, jsonb_build_object('campo', 'Incoterm', 'preenchidos', (SELECT count(*) FROM base WHERE incoterm <> ''))
      UNION ALL SELECT 12, jsonb_build_object('campo', 'Data de abertura', 'preenchidos', (SELECT count(*) FROM base WHERE data_abertura IS NOT NULL))
    ) c
  )
);
$$;

REVOKE ALL ON FUNCTION public.qualidade_dados_analise() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.qualidade_dados_analise() FROM anon;
GRANT EXECUTE ON FUNCTION public.qualidade_dados_analise() TO authenticated;