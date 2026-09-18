create or replace function public.atualizar_analises()
returns void
language plpgsql
security definer
set search_path to 'public', 'analitico'
as $function$
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
  refresh materialized view analitico.mv_qualidade_resumo;
  refresh materialized view analitico.mv_cliente_lista;
  refresh materialized view analitico.mv_cliente_media_geral;
  refresh materialized view analitico.mv_dashboard_base;
  refresh materialized view analitico.mv_analista_ind;
  refresh materialized view analitico.mv_analista_cliente;
  refresh materialized view analitico.mv_analista_rota;
  refresh materialized view analitico.mv_analista_coloader;
  refresh materialized view analitico.mv_analista_agente;
  refresh materialized view analitico.mv_analista_motivo;
  refresh materialized view analitico.mv_analista_rota_agente;
  refresh materialized view analitico.mv_motivo_ind;
  refresh materialized view analitico.mv_motivo_rota;
  refresh materialized view analitico.mv_motivo_cliente;
  refresh materialized view analitico.mv_motivo_coloader;
  refresh materialized view analitico.mv_motivo_agente;
  refresh materialized view analitico.mv_motivo_rota_cliente;
  refresh materialized view analitico.mv_motivo_mes;
end;
$function$;

revoke execute on function public.atualizar_analises() from public, anon, authenticated;