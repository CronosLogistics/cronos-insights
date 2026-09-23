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
  PERFORM public.atualizar_analises_periodo();
END;
$function$;