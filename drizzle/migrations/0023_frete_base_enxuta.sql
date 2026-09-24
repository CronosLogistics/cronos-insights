create materialized view analitico.mv_ofertas_frete_slim as
select produto, modalidade_f, ano_f, mes_f, oferta, cliente_analitico, rota_analitica, coloader_analitico,
       agente_analitico, analista_pricing, motivo_perda_analitico, flag_aprovada, flag_reprovada, flag_em_analise,
       pais_origem_f, porto_origem, pais_destino_f, porto_destino, mes_ref
from analitico.mv_ofertas_frete;
create index mv_ofertas_frete_slim_idx on analitico.mv_ofertas_frete_slim (produto, modalidade_f, ano_f, mes_f);
revoke all on analitico.mv_ofertas_frete_slim from public, anon, authenticated;

do $do$
declare f text; d text;
begin
  foreach f in array array['rotas_analise_frete','agentes_analise_frete','analistas_analise_frete','coloaders_analise_frete','motivos_perda_analise_frete'] loop
    d := pg_get_functiondef(('public.' || f)::regproc);
    d := replace(d, 'analitico.mv_ofertas_frete ', 'analitico.mv_ofertas_frete_slim ');
    d := replace(d, 'with base as (', 'with base as materialized (');
    d := replace(d, 'with base_hist as (', 'with base_hist as materialized (');
    if position('mv_ofertas_frete_slim' in d) = 0 then raise exception 'falhou %', f; end if;
    execute d;
  end loop;
end
$do$;

create or replace function public.atualizar_analises_frete() returns void language plpgsql security definer set search_path = public, analitico as $$ begin
refresh materialized view analitico.mv_ofertas_frete; refresh materialized view analitico.mv_ofertas_frete_slim; refresh materialized view analitico.mv_modalidade_frete_opcoes; refresh materialized view analitico.mv_dashboard_frete; end $$;
revoke all on function public.atualizar_analises_frete from public, anon, authenticated;
notify pgrst, 'reload schema';