create schema if not exists analitico;
grant usage on schema analitico to authenticated;

alter materialized view public.mv_kpis_geral set schema analitico;
alter materialized view public.mv_ofertas_mensal set schema analitico;
alter materialized view public.mv_rotas set schema analitico;
alter materialized view public.mv_clientes set schema analitico;
alter materialized view public.mv_coloaders set schema analitico;
alter materialized view public.mv_agentes set schema analitico;
alter materialized view public.mv_analistas set schema analitico;
alter materialized view public.mv_vendedores set schema analitico;
alter materialized view public.mv_motivos_perda set schema analitico;
alter materialized view public.mv_qualidade_dados set schema analitico;

grant select on analitico.mv_kpis_geral, analitico.mv_ofertas_mensal, analitico.mv_rotas,
  analitico.mv_clientes, analitico.mv_coloaders, analitico.mv_agentes, analitico.mv_analistas,
  analitico.mv_vendedores, analitico.mv_motivos_perda, analitico.mv_qualidade_dados
  to authenticated;

create or replace view public.v_kpis_geral with (security_invoker = true) as
select * from analitico.mv_kpis_geral where produto = public.produto_do_usuario();
create or replace view public.v_ofertas_mensal with (security_invoker = true) as
select * from analitico.mv_ofertas_mensal where produto = public.produto_do_usuario();
create or replace view public.v_rotas with (security_invoker = true) as
select * from analitico.mv_rotas where produto = public.produto_do_usuario();
create or replace view public.v_clientes with (security_invoker = true) as
select * from analitico.mv_clientes where produto = public.produto_do_usuario();
create or replace view public.v_coloaders with (security_invoker = true) as
select * from analitico.mv_coloaders where produto = public.produto_do_usuario();
create or replace view public.v_agentes with (security_invoker = true) as
select * from analitico.mv_agentes where produto = public.produto_do_usuario();
create or replace view public.v_analistas with (security_invoker = true) as
select * from analitico.mv_analistas where produto = public.produto_do_usuario();
create or replace view public.v_vendedores with (security_invoker = true) as
select * from analitico.mv_vendedores where produto = public.produto_do_usuario();
create or replace view public.v_motivos_perda with (security_invoker = true) as
select * from analitico.mv_motivos_perda where produto = public.produto_do_usuario();
create or replace view public.v_qualidade_dados with (security_invoker = true) as
select * from analitico.mv_qualidade_dados where produto = public.produto_do_usuario();

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
end;
$$;

revoke all on function public.atualizar_analises() from public, anon, authenticated;
