create or replace view public.v_ofertas_analitico
with (security_invoker = true) as
select
  o.id,
  o.oferta,
  coalesce(nullif(btrim(o.cliente), ''), '(Não informado)') as cliente_analitico,
  coalesce(nullif(btrim(o.origem), ''), 'Não informado') || ' → ' || coalesce(nullif(btrim(o.destino), ''), 'Não informado') as rota_analitica,
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

create index if not exists ofertas_produto_origem_destino_idx
  on public.ofertas (produto, origem, destino);

create or replace function public.rotas_opcoes_filtro()
returns jsonb
language sql
stable
set search_path = public
as $$
  with b as (
    select pais_origem, porto_origem, pais_destino, porto_destino, rota_analitica
    from public.v_ofertas_analitico
  )
  select jsonb_build_object(
    'paisesOrigem', (select coalesce(jsonb_agg(distinct pais_origem order by pais_origem), '[]'::jsonb) from b),
    'portosOrigem', (select coalesce(jsonb_agg(distinct porto_origem order by porto_origem), '[]'::jsonb) from b),
    'paisesDestino', (select coalesce(jsonb_agg(distinct pais_destino order by pais_destino), '[]'::jsonb) from b),
    'portosDestino', (select coalesce(jsonb_agg(distinct porto_destino order by porto_destino), '[]'::jsonb) from b),
    'rotas', (select coalesce(jsonb_agg(distinct rota_analitica order by rota_analitica), '[]'::jsonb) from b)
  );
$$;

create or replace function public.rotas_analise(
  p_pais_origem text default 'Todos',
  p_porto_origem text default 'Todos',
  p_pais_destino text default 'Todos',
  p_porto_destino text default 'Todos',
  p_rota text default 'Todos'
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with base as (
    select *
    from public.v_ofertas_analitico
    where (p_pais_origem = 'Todos' or pais_origem = p_pais_origem)
      and (p_porto_origem = 'Todos' or porto_origem = p_porto_origem)
      and (p_pais_destino = 'Todos' or pais_destino = p_pais_destino)
      and (p_porto_destino = 'Todos' or porto_destino = p_porto_destino)
      and (p_rota = 'Todos' or rota_analitica = p_rota)
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
  col as (
    select coloader_analitico as item,
      count(*)::bigint as rotas,
      coalesce(sum(flag_aprovada), 0)::bigint as aprovadas,
      coalesce(sum(flag_reprovada), 0)::bigint as reprovadas,
      coalesce(sum(flag_em_analise), 0)::bigint as em_analise
    from base group by 1
  ),
  cli as (
    select cliente_analitico as item,
      count(*)::bigint as rotas,
      coalesce(sum(flag_aprovada), 0)::bigint as aprovadas,
      coalesce(sum(flag_reprovada), 0)::bigint as reprovadas,
      coalesce(sum(flag_em_analise), 0)::bigint as em_analise
    from base group by 1 order by 2 desc, 1 limit 10
  ),
  age as (
    select agente_analitico as item,
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
  cc as (
    select cliente_analitico as cliente, coloader_analitico as coloader,
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
    'coloaders', coalesce((select jsonb_agg(to_jsonb(c) order by c.rotas desc, c.item) from col c), '[]'::jsonb),
    'clientes', coalesce((select jsonb_agg(to_jsonb(c) order by c.rotas desc, c.item) from cli c), '[]'::jsonb),
    'agentes', coalesce((select jsonb_agg(to_jsonb(a) order by a.rotas desc, a.item) from age a), '[]'::jsonb),
    'motivosTotal', (select total from mot_total),
    'motivos', coalesce((select jsonb_agg(to_jsonb(m) order by m.reprovadas desc, m.motivo) from mot m), '[]'::jsonb),
    'clienteColoader', coalesce((select jsonb_agg(to_jsonb(x) order by x.reprovadas desc, x.rotas desc, x.cliente, x.coloader) from cc x), '[]'::jsonb)
  );
$$;

revoke all on function public.rotas_opcoes_filtro() from public, anon;
revoke all on function public.rotas_analise(text, text, text, text, text) from public, anon;
grant execute on function public.rotas_opcoes_filtro() to authenticated;
grant execute on function public.rotas_analise(text, text, text, text, text) to authenticated;