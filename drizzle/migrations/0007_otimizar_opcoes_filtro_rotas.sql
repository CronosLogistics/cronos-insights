CREATE MATERIALIZED VIEW analitico.mv_rota_opcoes AS
SELECT
  produto,
  array_agg(DISTINCT pais_origem ORDER BY pais_origem) AS paises_origem,
  array_agg(DISTINCT porto_origem ORDER BY porto_origem) AS portos_origem,
  array_agg(DISTINCT pais_destino ORDER BY pais_destino) AS paises_destino,
  array_agg(DISTINCT porto_destino ORDER BY porto_destino) AS portos_destino,
  array_agg(DISTINCT rota ORDER BY rota) AS rotas
FROM analitico.mv_rota_base
GROUP BY produto;

CREATE UNIQUE INDEX mv_rota_opcoes_produto_idx
  ON analitico.mv_rota_opcoes (produto);

CREATE OR REPLACE FUNCTION public.rotas_opcoes_filtro()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'analitico'
AS $function$
  WITH permitidas AS (
    SELECT o.*
    FROM analitico.mv_rota_opcoes o
    WHERE o.produto = ANY (public.produtos_do_usuario())
  )
  SELECT jsonb_build_object(
    'paisesOrigem', COALESCE((
      SELECT jsonb_agg(v ORDER BY v)
      FROM (SELECT DISTINCT unnest(paises_origem) AS v FROM permitidas) x
    ), '[]'::jsonb),
    'portosOrigem', COALESCE((
      SELECT jsonb_agg(v ORDER BY v)
      FROM (SELECT DISTINCT unnest(portos_origem) AS v FROM permitidas) x
    ), '[]'::jsonb),
    'paisesDestino', COALESCE((
      SELECT jsonb_agg(v ORDER BY v)
      FROM (SELECT DISTINCT unnest(paises_destino) AS v FROM permitidas) x
    ), '[]'::jsonb),
    'portosDestino', COALESCE((
      SELECT jsonb_agg(v ORDER BY v)
      FROM (SELECT DISTINCT unnest(portos_destino) AS v FROM permitidas) x
    ), '[]'::jsonb),
    'rotas', COALESCE((
      SELECT jsonb_agg(v ORDER BY v)
      FROM (SELECT DISTINCT unnest(rotas) AS v FROM permitidas) x
    ), '[]'::jsonb)
  );
$function$;

REVOKE ALL ON FUNCTION public.rotas_opcoes_filtro() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotas_opcoes_filtro() TO authenticated;

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
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_base;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_ind;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_cliente;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_rota;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_agente;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_motivo;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_rota_cliente;
  REFRESH MATERIALIZED VIEW analitico.mv_rota_base;
  REFRESH MATERIALIZED VIEW analitico.mv_rota_opcoes;
END;
$function$;