drop materialized view analitico.mv_ofertas_frete cascade;

create materialized view analitico.mv_ofertas_frete_slim as
select produto, coalesce(nullif(btrim(modalidade), ''), 'Não informado') as modalidade_f, ano_f, mes_f, oferta,
       cliente_analitico, rota_analitica, coloader_analitico, agente_analitico, analista_pricing, motivo_perda_analitico,
       flag_aprovada, flag_reprovada, flag_em_analise, pais_origem_f, porto_origem, pais_destino_f, porto_destino, mes_ref
from analitico.mv_ofertas_periodo
order by 1, 2, 3, 4;
create index mv_ofertas_frete_slim_idx on analitico.mv_ofertas_frete_slim (produto, modalidade_f, ano_f, mes_f);
revoke all on analitico.mv_ofertas_frete_slim from public, anon, authenticated;

create index if not exists mv_ofertas_periodo_frete_idx on analitico.mv_ofertas_periodo (produto, (coalesce(nullif(btrim(modalidade), ''), 'Não informado')));

do $do$
declare d text;
begin
  d := pg_get_functiondef('public.qualidade_dados_analise_frete'::regproc);
  d := replace(d, 'from analitico.mv_ofertas_frete o where o.produto = any(public.produtos_do_usuario()) and o.modalidade_f = p_modalidade',
                  'from analitico.mv_ofertas_periodo o where o.produto = any(public.produtos_do_usuario()) and coalesce(nullif(btrim(o.modalidade), ''''), ''Não informado'') = p_modalidade');
  if position('mv_ofertas_periodo o' in d) = 0 then raise exception 'falhou qualidade'; end if;
  execute d;
end
$do$;

create or replace function public.atualizar_analises_frete() returns void language plpgsql security definer set search_path = public, analitico as $$ begin
refresh materialized view analitico.mv_ofertas_frete_slim; refresh materialized view analitico.mv_modalidade_frete_opcoes; refresh materialized view analitico.mv_dashboard_frete; end $$;
revoke all on function public.atualizar_analises_frete from public, anon, authenticated;
alter function public.dashboard_analise_frete set work_mem = '64MB';
notify pgrst, 'reload schema';