CREATE MATERIALIZED VIEW analitico.mv_dashboard_opcoes AS
SELECT
  produto,
  min(data_abertura) AS data_inicial,
  max(data_abertura) AS data_final,
  array_agg(DISTINCT analista ORDER BY analista) AS analistas,
  array_agg(DISTINCT vendedor ORDER BY vendedor) AS vendedores,
  array_agg(DISTINCT cliente ORDER BY cliente) AS clientes,
  array_agg(DISTINCT origem ORDER BY origem) AS origens,
  array_agg(DISTINCT destino ORDER BY destino) AS destinos,
  array_agg(DISTINCT rota ORDER BY rota) AS rotas,
  array_agg(DISTINCT coloader ORDER BY coloader) AS coloaders,
  array_agg(DISTINCT resultado_opcao ORDER BY resultado_opcao) FILTER (WHERE resultado_opcao IS NOT NULL) AS resultados,
  array_agg(DISTINCT motivo_opcao ORDER BY motivo_opcao) FILTER (WHERE motivo_opcao IS NOT NULL) AS motivos
FROM analitico.mv_dashboard_base
GROUP BY produto;

CREATE UNIQUE INDEX mv_dashboard_opcoes_produto_idx
  ON analitico.mv_dashboard_opcoes (produto);

REVOKE ALL ON analitico.mv_dashboard_opcoes FROM PUBLIC, anon, authenticated;
GRANT ALL ON analitico.mv_dashboard_opcoes TO service_role;

CREATE OR REPLACE FUNCTION public.dashboard_opcoes_filtro()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'analitico'
AS $function$
  WITH permitidas AS MATERIALIZED (
    SELECT o.*
    FROM analitico.mv_dashboard_opcoes o
    WHERE o.produto = ANY (public.produtos_do_usuario())
  )
  SELECT jsonb_build_object(
    'data_inicial', (SELECT to_char(min(data_inicial), 'YYYY-MM-DD') FROM permitidas),
    'data_final', (SELECT to_char(max(data_final), 'YYYY-MM-DD') FROM permitidas),
    'analistas', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM (SELECT DISTINCT unnest(analistas) AS v FROM permitidas) x), '[]'::jsonb),
    'vendedores', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM (SELECT DISTINCT unnest(vendedores) AS v FROM permitidas) x), '[]'::jsonb),
    'clientes', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM (SELECT DISTINCT unnest(clientes) AS v FROM permitidas) x), '[]'::jsonb),
    'origens', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM (SELECT DISTINCT unnest(origens) AS v FROM permitidas) x), '[]'::jsonb),
    'destinos', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM (SELECT DISTINCT unnest(destinos) AS v FROM permitidas) x), '[]'::jsonb),
    'rotas', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM (SELECT DISTINCT unnest(rotas) AS v FROM permitidas) x), '[]'::jsonb),
    'coloaders', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM (SELECT DISTINCT unnest(coloaders) AS v FROM permitidas) x), '[]'::jsonb),
    'resultados', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM (SELECT DISTINCT unnest(resultados) AS v FROM permitidas) x), '[]'::jsonb),
    'motivos', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM (SELECT DISTINCT unnest(motivos) AS v FROM permitidas) x), '[]'::jsonb)
  );
$function$;

REVOKE ALL ON FUNCTION public.dashboard_opcoes_filtro() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_opcoes_filtro() TO authenticated;

DO $do$
DECLARE
  v_oid oid;
  v_def text;
BEGIN
  SELECT p.oid INTO v_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'atualizar_analises'
    AND pg_get_function_identity_arguments(p.oid) = '';

  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'Função public.atualizar_analises() não encontrada';
  END IF;

  v_def := pg_get_functiondef(v_oid);
  IF position('REFRESH MATERIALIZED VIEW analitico.mv_dashboard_opcoes;' in v_def) = 0 THEN
    v_def := replace(
      v_def,
      'REFRESH MATERIALIZED VIEW analitico.mv_dashboard_base;',
      'REFRESH MATERIALIZED VIEW analitico.mv_dashboard_base;' || E'\n  ' ||
      'REFRESH MATERIALIZED VIEW analitico.mv_dashboard_opcoes;'
    );
    EXECUTE v_def;
  END IF;
END;
$do$;

NOTIFY pgrst, 'reload schema';