-- Alinha Rota_Analitica à planilha:
-- IF(OR(TRIM(origem)="", TRIM(destino)=""), "(Rota incompleta)", origem & " → " & destino)
create or replace view public.v_ofertas_analitico
with (security_invoker = true) as
select
  o.id,
  o.oferta,
  coalesce(nullif(btrim(o.cliente), ''), '(Não informado)') as cliente_analitico,
  case
    when nullif(btrim(o.origem), '') is null
      or nullif(btrim(o.destino), '') is null
    then '(Rota incompleta)'
    else btrim(o.origem) || ' → ' || btrim(o.destino)
  end as rota_analitica,
  coalesce(nullif(btrim(o.armador), ''), '(Não informado)') as coloader_analitico,
  coalesce(nullif(btrim(o.agente), ''), '(Não informado)') as agente_analitico,
  coalesce(nullif(btrim(o.motivo), ''), '(Não informado)') as motivo_perda_analitico,
  (o.analise = 'Aprovado')::integer as flag_aprovada,
  (o.analise = 'Reprovado')::integer as flag_reprovada,
  (o.analise = 'Em Aberto')::integer as flag_em_analise,
  coalesce(nullif(btrim(o.pais_origem), ''), '(Não informado)') as pais_origem,
  coalesce(nullif(btrim(o.origem), ''), '(Não informado)') as porto_origem,
  coalesce(nullif(btrim(o.pais_destino), ''), '(Não informado)') as pais_destino,
  coalesce(nullif(btrim(o.destino), ''), '(Não informado)') as porto_destino
from public.ofertas o
where o.produto is not null;

grant select on public.v_ofertas_analitico to authenticated;

-- Garante "(Rota incompleta)" na lista do filtro mesmo sem ocorrências no produto.
create or replace function public.rotas_opcoes_filtro()
returns jsonb
language sql
stable
set search_path = public
as $$
  with b as (
    select pais_origem, porto_origem, pais_destino, porto_destino, rota_analitica
    from public.v_ofertas_analitico
  ),
  rotas as (
    select distinct rota_analitica as v from b
    union
    select '(Rota incompleta)'::text
  )
  select jsonb_build_object(
    'paisesOrigem', (select coalesce(jsonb_agg(distinct pais_origem order by pais_origem), '[]'::jsonb) from b),
    'portosOrigem', (select coalesce(jsonb_agg(distinct porto_origem order by porto_origem), '[]'::jsonb) from b),
    'paisesDestino', (select coalesce(jsonb_agg(distinct pais_destino order by pais_destino), '[]'::jsonb) from b),
    'portosDestino', (select coalesce(jsonb_agg(distinct porto_destino order by porto_destino), '[]'::jsonb) from b),
    'rotas', (select coalesce(jsonb_agg(v order by v), '[]'::jsonb) from rotas)
  );
$$;

revoke all on function public.rotas_opcoes_filtro() from public, anon;
grant execute on function public.rotas_opcoes_filtro() to authenticated;
