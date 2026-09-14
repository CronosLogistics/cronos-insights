drop view if exists public.v_rotas;

create view public.v_rotas
with (security_invoker = true) as
select
  coalesce(origem, 'Não informado') || ' → ' || coalesce(destino, 'Não informado') as rota,
  origem,
  destino,
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
where origem is not null or destino is not null
group by 1, origem, destino;

grant select on public.v_rotas to authenticated;

create or replace view public.v_kpis_geral
with (security_invoker = true) as
select
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
from public.ofertas;

create or replace view public.v_cotacoes_em_analise
with (security_invoker = true) as
select
  oferta,
  revisao,
  cliente,
  coalesce(origem, 'Não informado') || ' → ' || coalesce(destino, 'Não informado') as rota,
  modalidade,
  pricing,
  vendedor,
  status,
  data_abertura,
  (current_date - data_abertura) as dias_em_aberto,
  case
    when data_abertura is null then 'Sem data'
    when current_date - data_abertura > 15 then 'Crítica'
    when current_date - data_abertura > 5 then 'Atenção'
    else 'Normal'
  end as faixa_atencao
from public.ofertas
where analise = 'Em Aberto';

create or replace view public.v_motivos_perda
with (security_invoker = true) as
select
  motivo,
  count(*)::bigint as reprovacoes,
  round(100.0 * count(*) / nullif((select count(*) from public.ofertas where analise = 'Reprovado' and motivo is not null), 0), 1) as participacao_pct,
  mode() within group (order by cliente) as cliente_recorrente,
  mode() within group (order by coalesce(origem,'-') || ' → ' || coalesce(destino,'-')) as rota_recorrente
from public.ofertas
where analise = 'Reprovado' and motivo is not null
group by motivo;

create or replace view public.v_clientes
with (security_invoker = true) as
select
  cliente,
  count(*)::bigint as ofertas,
  count(*) filter (where analise = 'Aprovado')::bigint as aprovadas,
  count(*) filter (where analise = 'Reprovado')::bigint as reprovadas,
  count(*) filter (where analise = 'Em Aberto')::bigint as em_aberto,
  round(100.0 * count(*) filter (where analise = 'Aprovado')
    / nullif(count(*) filter (where analise in ('Aprovado','Reprovado')), 0), 1) as conversao_pct,
  count(distinct (coalesce(origem,'-') || '→' || coalesce(destino,'-')))::bigint as rotas,
  max(data_abertura) as ultima_oferta
from public.ofertas
where cliente is not null
group by cliente;

create or replace view public.v_coloaders
with (security_invoker = true) as
select
  armador as coloader,
  count(*)::bigint as ofertas,
  count(*) filter (where analise = 'Aprovado')::bigint as aprovadas,
  count(*) filter (where analise = 'Reprovado')::bigint as reprovadas,
  round(100.0 * count(*) filter (where analise = 'Aprovado')
    / nullif(count(*) filter (where analise in ('Aprovado','Reprovado')), 0), 1) as conversao_pct,
  count(distinct (coalesce(origem,'-') || '→' || coalesce(destino,'-')))::bigint as rotas,
  round(sum(teus), 1) as teus
from public.ofertas
where armador is not null
group by armador;

create or replace view public.v_vendedores
with (security_invoker = true) as
select
  vendedor,
  count(*)::bigint as ofertas,
  count(*) filter (where analise = 'Aprovado')::bigint as aprovadas,
  count(*) filter (where analise = 'Reprovado')::bigint as reprovadas,
  round(100.0 * count(*) filter (where analise = 'Aprovado')
    / nullif(count(*) filter (where analise in ('Aprovado','Reprovado')), 0), 1) as conversao_pct,
  count(distinct cliente)::bigint as clientes,
  count(distinct (coalesce(origem,'-') || '→' || coalesce(destino,'-')))::bigint as rotas
from public.ofertas
where vendedor is not null
group by vendedor;