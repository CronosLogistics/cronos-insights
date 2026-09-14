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
  count(distinct rota)::bigint as rotas,
  count(distinct cliente)::bigint as clientes,
  count(distinct armador)::bigint as coloaders,
  count(distinct agente)::bigint as agentes,
  count(distinct vendedor)::bigint as vendedores,
  count(distinct pricing)::bigint as analistas,
  round(sum(teus), 1) as teus,
  min(data_abertura) as primeira_abertura,
  max(data_abertura) as ultima_abertura
from public.ofertas;

create or replace view public.v_ofertas_mensal
with (security_invoker = true) as
select
  mes_ano,
  ano,
  mes,
  count(*)::bigint as ofertas,
  count(*) filter (where analise = 'Aprovado')::bigint as aprovadas,
  count(*) filter (where analise = 'Reprovado')::bigint as reprovadas,
  count(*) filter (where analise = 'Em Aberto')::bigint as em_aberto,
  round(100.0 * count(*) filter (where analise = 'Aprovado')
    / nullif(count(*) filter (where analise in ('Aprovado','Reprovado')), 0), 1) as conversao_pct
from public.ofertas
where mes_ano is not null
group by 1, 2, 3;

create or replace view public.v_rotas
with (security_invoker = true) as
select
  rota,
  max(origem) as origem,
  max(destino) as destino,
  max(modalidade) as modalidade,
  count(*)::bigint as ofertas,
  count(*) filter (where analise = 'Aprovado')::bigint as aprovadas,
  count(*) filter (where analise = 'Reprovado')::bigint as reprovadas,
  count(*) filter (where analise = 'Em Aberto')::bigint as em_aberto,
  round(100.0 * count(*) filter (where analise = 'Aprovado')
    / nullif(count(*) filter (where analise in ('Aprovado','Reprovado')), 0), 1) as conversao_pct,
  count(distinct cliente)::bigint as clientes,
  round(sum(teus), 1) as teus
from public.ofertas
where rota is not null
group by rota;

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
  count(distinct rota)::bigint as rotas,
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
  count(distinct rota)::bigint as rotas,
  round(sum(teus), 1) as teus
from public.ofertas
where armador is not null
group by armador;

create or replace view public.v_agentes
with (security_invoker = true) as
select
  agente,
  count(*)::bigint as ofertas,
  count(*) filter (where analise = 'Aprovado')::bigint as aprovadas,
  count(*) filter (where analise = 'Reprovado')::bigint as reprovadas,
  round(100.0 * count(*) filter (where analise = 'Aprovado')
    / nullif(count(*) filter (where analise in ('Aprovado','Reprovado')), 0), 1) as conversao_pct,
  count(distinct pais_origem)::bigint as origens,
  count(distinct cliente)::bigint as clientes
from public.ofertas
where agente is not null
group by agente;

create or replace view public.v_analistas
with (security_invoker = true) as
select
  pricing as analista,
  count(*)::bigint as ofertas,
  count(*) filter (where analise in ('Aprovado','Reprovado'))::bigint as decididas,
  count(*) filter (where analise = 'Em Aberto')::bigint as em_aberto,
  count(*) filter (where analise = 'Aprovado')::bigint as aprovadas,
  round(100.0 * count(*) filter (where analise = 'Aprovado')
    / nullif(count(*) filter (where analise in ('Aprovado','Reprovado')), 0), 1) as conversao_pct,
  round(avg(tempo_resposta_pricing_horas), 1) as tempo_medio_horas
from public.ofertas
where pricing is not null
group by pricing;

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
  count(distinct rota)::bigint as rotas
from public.ofertas
where vendedor is not null
group by vendedor;

create or replace view public.v_motivos_perda
with (security_invoker = true) as
select
  motivo,
  count(*)::bigint as reprovacoes,
  round(100.0 * count(*) / nullif((select count(*) from public.ofertas where analise = 'Reprovado' and motivo is not null), 0), 1) as participacao_pct,
  mode() within group (order by cliente) as cliente_recorrente,
  mode() within group (order by rota) as rota_recorrente
from public.ofertas
where analise = 'Reprovado' and motivo is not null
group by motivo;

create or replace view public.v_cotacoes_em_analise
with (security_invoker = true) as
select
  oferta,
  revisao,
  cliente,
  rota,
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

create or replace view public.v_qualidade_dados
with (security_invoker = true) as
with t as (select count(*)::numeric as total from public.ofertas)
select campo, preenchidos, (select total from t)::bigint - preenchidos as vazios,
  round(100.0 * preenchidos / nullif((select total from t), 0), 1) as preenchimento_pct
from (
  select 'Cliente' as campo, count(cliente)::bigint as preenchidos from public.ofertas
  union all select 'Rota', count(rota) from public.ofertas
  union all select 'Modalidade', count(modalidade) from public.ofertas
  union all select 'Incoterm', count(incoterm) from public.ofertas
  union all select 'Origem', count(origem) from public.ofertas
  union all select 'Destino', count(destino) from public.ofertas
  union all select 'País de origem', count(pais_origem) from public.ofertas
  union all select 'País de destino', count(pais_destino) from public.ofertas
  union all select 'Vendedor', count(vendedor) from public.ofertas
  union all select 'Inside sales', count(inside_sales) from public.ofertas
  union all select 'Analista de pricing', count(pricing) from public.ofertas
  union all select 'Status', count(status) from public.ofertas
  union all select 'Situação da análise', count(analise) from public.ofertas
  union all select 'Motivo de perda', count(motivo) from public.ofertas
  union all select 'Armador / coloader', count(armador) from public.ofertas
  union all select 'Agente', count(agente) from public.ofertas
  union all select 'Contêiner', count(container) from public.ofertas
  union all select 'Data de abertura', count(data_abertura) from public.ofertas
  union all select 'Data de conclusão', count(data_conclusao) from public.ofertas
  union all select 'Margem da oferta', count(mc_oferta_pct) from public.ofertas
  union all select 'TEUS', count(teus) from public.ofertas
  union all select 'Tempo de resposta Pricing', count(tempo_resposta_pricing_horas) from public.ofertas
) s;

grant select on public.v_kpis_geral to authenticated;
grant select on public.v_ofertas_mensal to authenticated;
grant select on public.v_rotas to authenticated;
grant select on public.v_clientes to authenticated;
grant select on public.v_coloaders to authenticated;
grant select on public.v_agentes to authenticated;
grant select on public.v_analistas to authenticated;
grant select on public.v_vendedores to authenticated;
grant select on public.v_motivos_perda to authenticated;
grant select on public.v_cotacoes_em_analise to authenticated;
grant select on public.v_qualidade_dados to authenticated;