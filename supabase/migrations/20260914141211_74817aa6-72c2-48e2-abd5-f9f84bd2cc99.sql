create index if not exists ofertas_produto_idx on public.ofertas (produto);
create index if not exists ofertas_produto_analise_idx on public.ofertas (produto, analise);
create index if not exists ofertas_produto_data_abertura_idx on public.ofertas (produto, data_abertura desc);

-- ============ Matviews pré-calculadas por produto ============
create materialized view public.mv_kpis_geral as
select
  produto,
  count(*)::bigint as ofertas,
  count(*) filter (where analise = 'Aprovado')::bigint as aprovadas,
  count(*) filter (where analise = 'Reprovado')::bigint as reprovadas,
  count(*) filter (where analise = 'Em Aberto')::bigint as em_aberto,
  round(100.0 * count(*) filter (where analise = 'Aprovado')
    / nullif(count(*) filter (where analise in ('Aprovado','Reprovado')), 0), 1) as conversao_pct,
  round(avg(tempo_resposta_pricing_horas), 1) as tempo_medio_horas,
  count(distinct (coalesce(origem,'-') || '→' || coalesce(destino,'-')))::bigint as rotas,
  count(distinct cliente)::bigint as clientes,
  count(distinct armador)::bigint as coloaders,
  count(distinct agente)::bigint as agentes,
  count(distinct vendedor)::bigint as vendedores,
  count(distinct pricing)::bigint as analistas,
  round(sum(teus), 1) as teus,
  min(data_abertura) as primeira_abertura,
  max(data_abertura) as ultima_abertura
from public.ofertas
where produto is not null
group by produto;
create unique index mv_kpis_geral_pk on public.mv_kpis_geral (produto);

create materialized view public.mv_ofertas_mensal as
select
  produto, mes_ano, ano, mes,
  count(*)::bigint as ofertas,
  count(*) filter (where analise = 'Aprovado')::bigint as aprovadas,
  count(*) filter (where analise = 'Reprovado')::bigint as reprovadas,
  count(*) filter (where analise = 'Em Aberto')::bigint as em_aberto,
  round(100.0 * count(*) filter (where analise = 'Aprovado')
    / nullif(count(*) filter (where analise in ('Aprovado','Reprovado')), 0), 1) as conversao_pct
from public.ofertas
where produto is not null and mes_ano is not null
group by produto, mes_ano, ano, mes;
create unique index mv_ofertas_mensal_pk on public.mv_ofertas_mensal (produto, mes_ano);

create materialized view public.mv_rotas as
select
  produto,
  coalesce(origem, 'Não informado') || ' → ' || coalesce(destino, 'Não informado') as rota,
  origem, destino,
  mode() within group (order by pais_origem) as pais_origem,
  mode() within group (order by pais_destino) as pais_destino,
  mode() within group (order by modalidade) as modalidade,
  count(*)::bigint as ofertas,
  count(*) filter (where analise = 'Aprovado')::bigint as aprovadas,
  count(*) filter (where analise = 'Reprovado')::bigint as reprovadas,
  count(*) filter (where analise = 'Em Aberto')::bigint as em_aberto,
  round(100.0 * count(*) filter (where analise = 'Aprovado')
    / nullif(count(*) filter (where analise in ('Aprovado','Reprovado')), 0), 1) as conversao_pct,
  count(distinct cliente)::bigint as clientes,
  round(sum(teus), 1) as teus
from public.ofertas
where produto is not null and (origem is not null or destino is not null)
group by produto, 2, origem, destino;
create index mv_rotas_produto_idx on public.mv_rotas (produto, ofertas desc);

create materialized view public.mv_clientes as
select
  produto, cliente,
  count(*)::bigint as ofertas,
  count(*) filter (where analise = 'Aprovado')::bigint as aprovadas,
  count(*) filter (where analise = 'Reprovado')::bigint as reprovadas,
  count(*) filter (where analise = 'Em Aberto')::bigint as em_aberto,
  round(100.0 * count(*) filter (where analise = 'Aprovado')
    / nullif(count(*) filter (where analise in ('Aprovado','Reprovado')), 0), 1) as conversao_pct,
  count(distinct (coalesce(origem,'-') || '→' || coalesce(destino,'-')))::bigint as rotas,
  max(data_abertura) as ultima_oferta
from public.ofertas
where produto is not null and cliente is not null
group by produto, cliente;
create index mv_clientes_produto_idx on public.mv_clientes (produto, ofertas desc);

create materialized view public.mv_coloaders as
select
  produto, armador as coloader,
  count(*)::bigint as ofertas,
  count(*) filter (where analise = 'Aprovado')::bigint as aprovadas,
  count(*) filter (where analise = 'Reprovado')::bigint as reprovadas,
  round(100.0 * count(*) filter (where analise = 'Aprovado')
    / nullif(count(*) filter (where analise in ('Aprovado','Reprovado')), 0), 1) as conversao_pct,
  count(distinct (coalesce(origem,'-') || '→' || coalesce(destino,'-')))::bigint as rotas,
  round(sum(teus), 1) as teus
from public.ofertas
where produto is not null and armador is not null
group by produto, armador;
create index mv_coloaders_produto_idx on public.mv_coloaders (produto, ofertas desc);

create materialized view public.mv_agentes as
select
  produto, agente,
  count(*)::bigint as ofertas,
  count(*) filter (where analise = 'Aprovado')::bigint as aprovadas,
  count(*) filter (where analise = 'Reprovado')::bigint as reprovadas,
  round(100.0 * count(*) filter (where analise = 'Aprovado')
    / nullif(count(*) filter (where analise in ('Aprovado','Reprovado')), 0), 1) as conversao_pct,
  count(distinct pais_origem)::bigint as origens,
  count(distinct cliente)::bigint as clientes
from public.ofertas
where produto is not null and agente is not null
group by produto, agente;
create index mv_agentes_produto_idx on public.mv_agentes (produto, ofertas desc);

create materialized view public.mv_analistas as
select
  produto, pricing as analista,
  count(*)::bigint as ofertas,
  count(*) filter (where analise in ('Aprovado','Reprovado'))::bigint as decididas,
  count(*) filter (where analise = 'Em Aberto')::bigint as em_aberto,
  count(*) filter (where analise = 'Aprovado')::bigint as aprovadas,
  round(100.0 * count(*) filter (where analise = 'Aprovado')
    / nullif(count(*) filter (where analise in ('Aprovado','Reprovado')), 0), 1) as conversao_pct,
  round(avg(tempo_resposta_pricing_horas), 1) as tempo_medio_horas
from public.ofertas
where produto is not null and pricing is not null
group by produto, pricing;
create index mv_analistas_produto_idx on public.mv_analistas (produto, ofertas desc);

create materialized view public.mv_vendedores as
select
  produto, vendedor,
  count(*)::bigint as ofertas,
  count(*) filter (where analise = 'Aprovado')::bigint as aprovadas,
  count(*) filter (where analise = 'Reprovado')::bigint as reprovadas,
  round(100.0 * count(*) filter (where analise = 'Aprovado')
    / nullif(count(*) filter (where analise in ('Aprovado','Reprovado')), 0), 1) as conversao_pct,
  count(distinct cliente)::bigint as clientes,
  count(distinct (coalesce(origem,'-') || '→' || coalesce(destino,'-')))::bigint as rotas
from public.ofertas
where produto is not null and vendedor is not null
group by produto, vendedor;
create index mv_vendedores_produto_idx on public.mv_vendedores (produto, ofertas desc);

create materialized view public.mv_motivos_perda as
with base as (
  select produto, motivo, cliente, origem, destino
  from public.ofertas
  where produto is not null and analise = 'Reprovado' and motivo is not null
), totais as (
  select produto, count(*)::numeric as total from base group by produto
)
select
  b.produto, b.motivo,
  count(*)::bigint as reprovacoes,
  round(100.0 * count(*) / nullif(t.total, 0), 1) as participacao_pct,
  mode() within group (order by b.cliente) as cliente_recorrente,
  mode() within group (order by coalesce(b.origem,'-') || ' → ' || coalesce(b.destino,'-')) as rota_recorrente
from base b
join totais t on t.produto = b.produto
group by b.produto, b.motivo, t.total;
create index mv_motivos_perda_produto_idx on public.mv_motivos_perda (produto, reprovacoes desc);

create materialized view public.mv_qualidade_dados as
with totais as (
  select produto, count(*)::numeric as total
  from public.ofertas where produto is not null group by produto
), campos as (
  select produto, 'Cliente' as campo, count(cliente) as preenchidos from public.ofertas where produto is not null group by produto
  union all select produto, 'Rota', count(rota) from public.ofertas where produto is not null group by produto
  union all select produto, 'Modalidade', count(modalidade) from public.ofertas where produto is not null group by produto
  union all select produto, 'Incoterm', count(incoterm) from public.ofertas where produto is not null group by produto
  union all select produto, 'Origem', count(origem) from public.ofertas where produto is not null group by produto
  union all select produto, 'Destino', count(destino) from public.ofertas where produto is not null group by produto
  union all select produto, 'País de origem', count(pais_origem) from public.ofertas where produto is not null group by produto
  union all select produto, 'País de destino', count(pais_destino) from public.ofertas where produto is not null group by produto
  union all select produto, 'Vendedor', count(vendedor) from public.ofertas where produto is not null group by produto
  union all select produto, 'Inside sales', count(inside_sales) from public.ofertas where produto is not null group by produto
  union all select produto, 'Analista de pricing', count(pricing) from public.ofertas where produto is not null group by produto
  union all select produto, 'Status', count(status) from public.ofertas where produto is not null group by produto
  union all select produto, 'Situação da análise', count(analise) from public.ofertas where produto is not null group by produto
  union all select produto, 'Motivo de perda', count(motivo) from public.ofertas where produto is not null group by produto
  union all select produto, 'Armador / coloader', count(armador) from public.ofertas where produto is not null group by produto
  union all select produto, 'Agente', count(agente) from public.ofertas where produto is not null group by produto
  union all select produto, 'Contêiner', count(container) from public.ofertas where produto is not null group by produto
  union all select produto, 'Data de abertura', count(data_abertura) from public.ofertas where produto is not null group by produto
  union all select produto, 'Data de conclusão', count(data_conclusao) from public.ofertas where produto is not null group by produto
  union all select produto, 'Margem da oferta', count(mc_oferta_pct) from public.ofertas where produto is not null group by produto
  union all select produto, 'TEUS', count(teus) from public.ofertas where produto is not null group by produto
  union all select produto, 'Tempo de resposta Pricing', count(tempo_resposta_pricing_horas) from public.ofertas where produto is not null group by produto
)
select
  c.produto, c.campo, c.preenchidos::bigint as preenchidos,
  (t.total::bigint - c.preenchidos)::bigint as vazios,
  round(100.0 * c.preenchidos / nullif(t.total, 0), 1) as preenchimento_pct
from campos c join totais t on t.produto = c.produto;
create unique index mv_qualidade_dados_pk on public.mv_qualidade_dados (produto, campo);

-- Matviews não são expostas ao aplicativo; apenas as visões filtradas abaixo.
revoke all on public.mv_kpis_geral, public.mv_ofertas_mensal, public.mv_rotas,
  public.mv_clientes, public.mv_coloaders, public.mv_agentes, public.mv_analistas,
  public.mv_vendedores, public.mv_motivos_perda, public.mv_qualidade_dados
  from anon, authenticated;

-- ============ Visões filtradas pelo produto do usuário ============
drop view if exists public.v_kpis_geral;
create view public.v_kpis_geral with (security_invoker = true) as
select * from public.mv_kpis_geral where produto = public.produto_do_usuario();

drop view if exists public.v_ofertas_mensal;
create view public.v_ofertas_mensal with (security_invoker = true) as
select * from public.mv_ofertas_mensal where produto = public.produto_do_usuario();

drop view if exists public.v_rotas;
create view public.v_rotas with (security_invoker = true) as
select * from public.mv_rotas where produto = public.produto_do_usuario();

drop view if exists public.v_clientes;
create view public.v_clientes with (security_invoker = true) as
select * from public.mv_clientes where produto = public.produto_do_usuario();

drop view if exists public.v_coloaders;
create view public.v_coloaders with (security_invoker = true) as
select * from public.mv_coloaders where produto = public.produto_do_usuario();

drop view if exists public.v_agentes;
create view public.v_agentes with (security_invoker = true) as
select * from public.mv_agentes where produto = public.produto_do_usuario();

drop view if exists public.v_analistas;
create view public.v_analistas with (security_invoker = true) as
select * from public.mv_analistas where produto = public.produto_do_usuario();

drop view if exists public.v_vendedores;
create view public.v_vendedores with (security_invoker = true) as
select * from public.mv_vendedores where produto = public.produto_do_usuario();

drop view if exists public.v_motivos_perda;
create view public.v_motivos_perda with (security_invoker = true) as
select * from public.mv_motivos_perda where produto = public.produto_do_usuario();

drop view if exists public.v_qualidade_dados;
create view public.v_qualidade_dados with (security_invoker = true) as
select * from public.mv_qualidade_dados where produto = public.produto_do_usuario();

grant select on public.v_kpis_geral, public.v_ofertas_mensal, public.v_rotas,
  public.v_clientes, public.v_coloaders, public.v_agentes, public.v_analistas,
  public.v_vendedores, public.v_motivos_perda, public.v_qualidade_dados
  to authenticated;

-- Recalcular análises após uma carga
create or replace function public.atualizar_analises()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view public.mv_kpis_geral;
  refresh materialized view public.mv_ofertas_mensal;
  refresh materialized view public.mv_rotas;
  refresh materialized view public.mv_clientes;
  refresh materialized view public.mv_coloaders;
  refresh materialized view public.mv_agentes;
  refresh materialized view public.mv_analistas;
  refresh materialized view public.mv_vendedores;
  refresh materialized view public.mv_motivos_perda;
  refresh materialized view public.mv_qualidade_dados;
end;
$$;

revoke all on function public.atualizar_analises() from public, anon, authenticated;
