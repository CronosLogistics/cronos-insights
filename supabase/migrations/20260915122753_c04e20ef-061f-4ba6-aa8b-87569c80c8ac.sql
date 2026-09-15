create index if not exists ofertas_produto_cliente_idx on public.ofertas (produto, cliente);

-- Base analítica (uma linha por revisão). RLS de public.ofertas aplica o produto.
create or replace view public.v_ofertas_analitico with (security_invoker = true) as
select
  o.id,
  o.oferta,
  coalesce(nullif(btrim(o.cliente), ''), '(Não informado)') as cliente_analitico,
  coalesce(nullif(btrim(o.origem), ''), 'Não informado') || ' → ' ||
    coalesce(nullif(btrim(o.destino), ''), 'Não informado') as rota_analitica,
  coalesce(nullif(btrim(o.armador), ''), '(Não informado)') as coloader_analitico,
  coalesce(nullif(btrim(o.agente), ''), '(Não informado)') as agente_analitico,
  coalesce(nullif(btrim(o.motivo), ''), '(Não informado)') as motivo_perda_analitico,
  (o.analise = 'Aprovado')::int as flag_aprovada,
  (o.analise = 'Reprovado')::int as flag_reprovada,
  (o.analise = 'Em Aberto')::int as flag_em_analise
from public.ofertas o
where o.produto is not null;

grant select on public.v_ofertas_analitico to authenticated;

-- Lista de clientes por produto (pré-calculada).
create materialized view if not exists analitico.mv_cliente_lista as
select
  produto,
  coalesce(nullif(btrim(cliente), ''), '(Não informado)') as cliente,
  count(*) as ofertas
from public.ofertas
where produto is not null
group by 1, 2;

create index if not exists mv_cliente_lista_produto_idx on analitico.mv_cliente_lista (produto);
grant select on analitico.mv_cliente_lista to authenticated;

create or replace view public.v_cliente_lista with (security_invoker = true) as
select cliente, ofertas from analitico.mv_cliente_lista
where produto = public.produto_do_usuario();

grant select on public.v_cliente_lista to authenticated;

-- Média geral do produto (base inteira).
create materialized view if not exists analitico.mv_cliente_media_geral as
select
  produto,
  count(*) filter (where analise = 'Aprovado') as aprovadas,
  count(*) filter (where analise = 'Reprovado') as reprovadas
from public.ofertas
where produto is not null
group by 1;

create index if not exists mv_cliente_media_geral_produto_idx on analitico.mv_cliente_media_geral (produto);
grant select on analitico.mv_cliente_media_geral to authenticated;

create or replace view public.v_cliente_media_geral with (security_invoker = true) as
select aprovadas, reprovadas from analitico.mv_cliente_media_geral
where produto = public.produto_do_usuario();

grant select on public.v_cliente_media_geral to authenticated;

create or replace function public.atualizar_analises()
returns void
language plpgsql
security definer
set search_path = public, analitico
as $$
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
  refresh materialized view analitico.mv_cliente_lista;
  refresh materialized view analitico.mv_cliente_media_geral;
end;
$$;

revoke all on function public.atualizar_analises() from public, anon, authenticated;