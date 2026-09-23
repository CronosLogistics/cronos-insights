create materialized view analitico.mv_analista_per as
select produto, analista_pricing as analista, ano_f, mes_f,
  cliente_analitico as cliente, rota_analitica as rota, coloader_analitico as coloader,
  agente_analitico as agente, motivo_perda_analitico as motivo,
  count(*)::bigint as rotas,
  coalesce(sum(flag_aprovada),0)::bigint as aprovadas,
  coalesce(sum(flag_reprovada),0)::bigint as reprovadas,
  coalesce(sum(flag_em_analise),0)::bigint as em_analise
from analitico.mv_ofertas_periodo
group by 1,2,3,4,5,6,7,8,9;
create index mv_analista_per_idx on analitico.mv_analista_per (produto, ano_f, mes_f, analista);

create materialized view analitico.mv_analista_per_oferta as
select distinct produto, analista_pricing as analista, ano_f, mes_f, nullif(btrim(coalesce(oferta,'')),'') as oferta
from analitico.mv_ofertas_periodo
where nullif(btrim(coalesce(oferta,'')),'') is not null;
create index mv_analista_per_oferta_idx on analitico.mv_analista_per_oferta (produto, ano_f, mes_f, analista);

revoke all on analitico.mv_analista_per, analitico.mv_analista_per_oferta from public, anon, authenticated;

create or replace function public.analistas_analise_periodo_calc(p_analista text default 'Todos', p_anos integer[] default null, p_meses integer[] default null)
returns jsonb language sql stable security definer set search_path = public, analitico
set work_mem = '64MB'
as $$
with prods as (select public.produtos_do_usuario() as p),
alvo as (select coalesce(nullif(regexp_replace(btrim(p_analista), '\s+', ' ', 'g'), ''), '(Não informado)') as a),
base as (
  select m.* from analitico.mv_analista_per m, prods, alvo
  where m.produto = any(prods.p)
    and (p_analista = 'Todos' or m.analista = alvo.a)
    and (coalesce(cardinality(p_anos),0) = 0 or m.ano_f = any(p_anos))
    and (coalesce(cardinality(p_meses),0) = 0 or m.mes_f = any(p_meses))
),
ofs as (
  select count(distinct o.oferta)::bigint n from analitico.mv_analista_per_oferta o, prods, alvo
  where o.produto = any(prods.p)
    and (p_analista = 'Todos' or o.analista = alvo.a)
    and (coalesce(cardinality(p_anos),0) = 0 or o.ano_f = any(p_anos))
    and (coalesce(cardinality(p_meses),0) = 0 or o.mes_f = any(p_meses))
),
ind as (
  select coalesce(sum(rotas),0)::bigint rotas, (select n from ofs) ofertas,
    count(distinct cliente)::bigint clientes, count(distinct rota)::bigint rotas_distintas,
    count(distinct coloader)::bigint coloaders,
    coalesce(sum(aprovadas),0)::bigint aprovadas, coalesce(sum(reprovadas),0)::bigint reprovadas,
    coalesce(sum(em_analise),0)::bigint em_analise
  from base
),
g_cli as (select cliente item, sum(rotas)::bigint rotas, sum(aprovadas)::bigint aprovadas, sum(reprovadas)::bigint reprovadas, sum(em_analise)::bigint em_analise from base group by 1 order by 2 desc, 1 limit 10),
g_rot as (select rota item, sum(rotas)::bigint rotas, sum(aprovadas)::bigint aprovadas, sum(reprovadas)::bigint reprovadas, sum(em_analise)::bigint em_analise from base group by 1 order by 2 desc, 1 limit 10),
g_col as (select coloader item, sum(rotas)::bigint rotas, sum(aprovadas)::bigint aprovadas, sum(reprovadas)::bigint reprovadas, sum(em_analise)::bigint em_analise from base group by 1 order by 2 desc, 1 limit 10),
g_ag as (select agente item, sum(rotas)::bigint rotas, sum(aprovadas)::bigint aprovadas, sum(reprovadas)::bigint reprovadas, sum(em_analise)::bigint em_analise from base group by 1 order by 2 desc, 1 limit 10),
g_mot as (select motivo, sum(reprovadas)::bigint reprovadas from base where reprovadas > 0 group by 1 order by 2 desc, 1 limit 10),
g_ra as (select rota, agente, sum(rotas)::bigint rotas, sum(aprovadas)::bigint aprovadas, sum(reprovadas)::bigint reprovadas, sum(em_analise)::bigint em_analise from base group by 1,2 order by 5 desc, 3 desc, 1, 2 limit 10)
select jsonb_build_object(
  'indicadores', (select to_jsonb(ind) from ind),
  'mediaAprovadas', coalesce((select sum(aprovadas) from analitico.mv_cliente_media_geral, prods where produto = any(prods.p)), 0),
  'mediaReprovadas', coalesce((select sum(reprovadas) from analitico.mv_cliente_media_geral, prods where produto = any(prods.p)), 0),
  'clientes', coalesce((select jsonb_agg(to_jsonb(c) order by c.rotas desc, c.item) from g_cli c), '[]'::jsonb),
  'rotas', coalesce((select jsonb_agg(to_jsonb(r) order by r.rotas desc, r.item) from g_rot r), '[]'::jsonb),
  'coloaders', coalesce((select jsonb_agg(to_jsonb(c) order by c.rotas desc, c.item) from g_col c), '[]'::jsonb),
  'agentes', coalesce((select jsonb_agg(to_jsonb(a) order by a.rotas desc, a.item) from g_ag a), '[]'::jsonb),
  'motivosTotal', (select reprovadas from ind),
  'motivos', coalesce((select jsonb_agg(to_jsonb(m) order by m.reprovadas desc, m.motivo) from g_mot m), '[]'::jsonb),
  'rotaAgente', coalesce((select jsonb_agg(to_jsonb(x) order by x.reprovadas desc, x.rotas desc, x.rota, x.agente) from g_ra x), '[]'::jsonb)
);
$$;
revoke all on function public.analistas_analise_periodo_calc(text,integer[],integer[]) from public, anon, authenticated;

create or replace function public.atualizar_analises_periodo()
returns void language plpgsql security definer set search_path = public, analitico as $$ begin
  refresh materialized view analitico.mv_agente_dt;
  refresh materialized view analitico.mv_rota_dt;
  refresh materialized view analitico.mv_ofertas_periodo;
  refresh materialized view analitico.mv_analista_per;
  refresh materialized view analitico.mv_analista_per_oferta;
end $$;