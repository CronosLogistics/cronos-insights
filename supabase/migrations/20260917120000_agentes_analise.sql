-- Ficha analítica da tela Agentes (aba AGENTES da planilha).
-- Agregações no banco; Produto garantido pela RLS de public.ofertas
-- via security_invoker em v_ofertas_analitico.

-- ARRUMAR(Agente): btrim + colapso de espaços internos (como na planilha).
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
  coalesce(
    nullif(regexp_replace(btrim(o.agente), '\s+', ' ', 'g'), ''),
    '(Não informado)'
  ) as agente_analitico,
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

create or replace function public.agentes_opcoes_filtro()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'agentes',
    coalesce(
      (
        select jsonb_agg(v order by v)
        from (
          select distinct agente_analitico as v
          from public.v_ofertas_analitico
        ) s
      ),
      '[]'::jsonb
    )
  );
$$;

create or replace function public.agentes_analise(
  p_agente text default 'Todos'
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with base as (
    select *
    from public.v_ofertas_analitico
    where (
      p_agente = 'Todos'
      or agente_analitico = coalesce(
        nullif(regexp_replace(btrim(p_agente), '\s+', ' ', 'g'), ''),
        '(Não informado)'
      )
    )
  ),
  ind as (
    select
      count(*)::bigint as rotas,
      count(distinct nullif(btrim(coalesce(oferta, '')), ''))::bigint as ofertas,
      count(distinct cliente_analitico)::bigint as clientes,
      count(distinct rota_analitica)::bigint as rotas_distintas,
      count(distinct coloader_analitico)::bigint as coloaders,
      coalesce(sum(flag_aprovada), 0)::bigint as aprovadas,
      coalesce(sum(flag_reprovada), 0)::bigint as reprovadas,
      coalesce(sum(flag_em_analise), 0)::bigint as em_analise
    from base
  ),
  -- Sem LIMIT: usado no perfil (melhor/pior conversão).
  rot as (
    select rota_analitica as item,
      count(*)::bigint as rotas,
      coalesce(sum(flag_aprovada), 0)::bigint as aprovadas,
      coalesce(sum(flag_reprovada), 0)::bigint as reprovadas,
      coalesce(sum(flag_em_analise), 0)::bigint as em_analise
    from base group by 1
  ),
  col as (
    select coloader_analitico as item,
      count(*)::bigint as rotas,
      coalesce(sum(flag_aprovada), 0)::bigint as aprovadas,
      coalesce(sum(flag_reprovada), 0)::bigint as reprovadas,
      coalesce(sum(flag_em_analise), 0)::bigint as em_analise
    from base group by 1 order by 2 desc, 1 limit 10
  ),
  cli as (
    select cliente_analitico as item,
      count(*)::bigint as rotas,
      coalesce(sum(flag_aprovada), 0)::bigint as aprovadas,
      coalesce(sum(flag_reprovada), 0)::bigint as reprovadas,
      coalesce(sum(flag_em_analise), 0)::bigint as em_analise
    from base group by 1 order by 2 desc, 1 limit 10
  ),
  mot_total as (select coalesce(sum(flag_reprovada), 0)::bigint as total from base),
  mot as (
    select motivo_perda_analitico as motivo, count(*)::bigint as reprovadas
    from base where flag_reprovada = 1 group by 1 order by 2 desc, 1 limit 10
  ),
  rc as (
    select rota_analitica as rota, coloader_analitico as coloader,
      count(*)::bigint as rotas,
      coalesce(sum(flag_aprovada), 0)::bigint as aprovadas,
      coalesce(sum(flag_reprovada), 0)::bigint as reprovadas,
      coalesce(sum(flag_em_analise), 0)::bigint as em_analise
    from base group by 1, 2 order by 5 desc, 3 desc, 1, 2 limit 10
  )
  select jsonb_build_object(
    'indicadores', (select to_jsonb(ind) from ind),
    'mediaAprovadas', coalesce((select aprovadas from public.v_cliente_media_geral), 0),
    'mediaReprovadas', coalesce((select reprovadas from public.v_cliente_media_geral), 0),
    'rotas', coalesce((select jsonb_agg(to_jsonb(r) order by r.rotas desc, r.item) from rot r), '[]'::jsonb),
    'coloaders', coalesce((select jsonb_agg(to_jsonb(c) order by c.rotas desc, c.item) from col c), '[]'::jsonb),
    'clientes', coalesce((select jsonb_agg(to_jsonb(c) order by c.rotas desc, c.item) from cli c), '[]'::jsonb),
    'motivosTotal', (select total from mot_total),
    'motivos', coalesce((select jsonb_agg(to_jsonb(m) order by m.reprovadas desc, m.motivo) from mot m), '[]'::jsonb),
    'rotaColoader', coalesce((select jsonb_agg(to_jsonb(x) order by x.reprovadas desc, x.rotas desc, x.rota, x.coloader) from rc x), '[]'::jsonb)
  );
$$;

revoke all on function public.agentes_opcoes_filtro() from public, anon;
revoke all on function public.agentes_analise(text) from public, anon;
grant execute on function public.agentes_opcoes_filtro() to authenticated;
grant execute on function public.agentes_analise(text) to authenticated;
