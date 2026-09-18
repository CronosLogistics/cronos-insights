-- Base derivada do DASHBOARD pré-calculada (schema interno, sem exposição na API).
create materialized view if not exists analitico.mv_dashboard_base as
select
  o.produto,
  o.oferta,
  coalesce(nullif(btrim(o.pricing), ''), '(Não informado)') as analista,
  coalesce(nullif(btrim(o.vendedor), ''), '(Não informado)') as vendedor,
  coalesce(nullif(btrim(o.cliente), ''), '(Não informado)') as cliente,
  coalesce(nullif(btrim(o.origem), ''), '(Não informado)') as origem,
  coalesce(nullif(btrim(o.destino), ''), '(Não informado)') as destino,
  (coalesce(nullif(btrim(o.origem), ''), 'Não informado') || ' → ' ||
   coalesce(nullif(btrim(o.destino), ''), 'Não informado')) as rota,
  coalesce(nullif(btrim(o.armador), ''), '(Não informado)') as coloader,
  btrim(coalesce(o.analise, '')) as resultado,
  coalesce(nullif(btrim(o.motivo), ''), '(Não informado)') as motivo,
  nullif(btrim(o.analise), '') as resultado_opcao,
  nullif(btrim(o.motivo), '') as motivo_opcao,
  o.data_abertura,
  (o.analise = 'Aprovado')::int as apr,
  (o.analise = 'Reprovado')::int as rep,
  (o.analise = 'Em Aberto')::int as ema,
  to_char(o.data_abertura, 'YYYY-MM') as mes
from public.ofertas o
where o.produto is not null;

create index if not exists mv_dashboard_base_produto_idx
  on analitico.mv_dashboard_base (produto, data_abertura);

revoke all on analitico.mv_dashboard_base from public, anon;
grant select on analitico.mv_dashboard_base to authenticated;

create or replace function public.dashboard_opcoes_filtro()
returns jsonb
language sql
stable
security definer
set search_path = public, analitico
as $$
  with b as (
    select * from analitico.mv_dashboard_base
    where produto = public.produto_do_usuario()
  )
  select jsonb_build_object(
    'data_inicial', (select to_char(min(data_abertura), 'YYYY-MM-DD') from b),
    'data_final',   (select to_char(max(data_abertura), 'YYYY-MM-DD') from b),
    'analistas',  (select coalesce(jsonb_agg(v order by v), '[]'::jsonb) from (select distinct analista v from b) s),
    'vendedores', (select coalesce(jsonb_agg(v order by v), '[]'::jsonb) from (select distinct vendedor v from b) s),
    'clientes',   (select coalesce(jsonb_agg(v order by v), '[]'::jsonb) from (select distinct cliente v from b) s),
    'origens',    (select coalesce(jsonb_agg(v order by v), '[]'::jsonb) from (select distinct origem v from b) s),
    'destinos',   (select coalesce(jsonb_agg(v order by v), '[]'::jsonb) from (select distinct destino v from b) s),
    'rotas',      (select coalesce(jsonb_agg(v order by v), '[]'::jsonb) from (select distinct rota v from b) s),
    'coloaders',  (select coalesce(jsonb_agg(v order by v), '[]'::jsonb) from (select distinct coloader v from b) s),
    'resultados', (select coalesce(jsonb_agg(v order by v), '[]'::jsonb) from (select distinct resultado_opcao v from b where resultado_opcao is not null) s),
    'motivos',    (select coalesce(jsonb_agg(v order by v), '[]'::jsonb) from (select distinct motivo_opcao v from b where motivo_opcao is not null) s)
  );
$$;

revoke execute on function public.dashboard_opcoes_filtro() from public, anon;
grant execute on function public.dashboard_opcoes_filtro() to authenticated;

create or replace function public.dashboard_analise(
  p_data_inicial date default null,
  p_data_final date default null,
  p_analista text default 'Todos',
  p_vendedor text default 'Todos',
  p_cliente text default 'Todos',
  p_origem text default 'Todos',
  p_destino text default 'Todos',
  p_rota text default 'Todos',
  p_coloader text default 'Todos',
  p_resultado text default 'Todos',
  p_motivo text default 'Todos',
  p_min_decisoes integer default 5
)
returns jsonb
language sql
stable
security definer
set search_path = public, analitico
as $$
  with base as materialized (
    select b.oferta, b.cliente, b.rota, b.coloader, b.motivo,
           b.apr, b.rep, b.ema, b.mes
    from analitico.mv_dashboard_base b
    where b.produto = public.produto_do_usuario()
      and (p_data_inicial is null or b.data_abertura >= p_data_inicial)
      and (p_data_final is null or b.data_abertura < (p_data_final + 1))
      and (coalesce(p_analista, 'Todos') = 'Todos' or b.analista = p_analista)
      and (coalesce(p_vendedor, 'Todos') = 'Todos' or b.vendedor = p_vendedor)
      and (coalesce(p_cliente, 'Todos') = 'Todos' or b.cliente = p_cliente)
      and (coalesce(p_origem, 'Todos') = 'Todos' or b.origem = p_origem)
      and (coalesce(p_destino, 'Todos') = 'Todos' or b.destino = p_destino)
      and (coalesce(p_rota, 'Todos') = 'Todos' or b.rota = p_rota)
      and (coalesce(p_coloader, 'Todos') = 'Todos' or b.coloader = p_coloader)
      and (coalesce(p_resultado, 'Todos') = 'Todos' or b.resultado = p_resultado)
      and (coalesce(p_motivo, 'Todos') = 'Todos' or b.motivo = p_motivo)
  ),
  alt as (
    select count(*)::int total, sum(apr)::int apr, sum(rep)::int rep, sum(ema)::int ema,
           count(distinct cliente)::int clientes, count(distinct rota)::int rotas,
           count(distinct coloader)::int coloaders
    from base
  ),
  ofu as (
    select count(distinct oferta)::int total,
           count(distinct oferta) filter (where apr = 1)::int apr,
           count(distinct oferta) filter (where rep = 1)::int rep,
           count(distinct oferta) filter (where ema = 1)::int ema
    from base
  ),
  mes as (
    select mes, count(*)::int rotas, sum(apr)::int apr, sum(rep)::int rep
    from base where mes is not null group by mes order by mes
  ),
  por_rota as (
    select rota, count(*)::int vol, sum(apr)::int apr, sum(rep)::int rep from base group by rota
  ),
  por_cliente as (
    select cliente, count(*)::int vol, sum(apr)::int apr, sum(rep)::int rep from base group by cliente
  ),
  combo as (
    select rota, coloader, count(*)::int vol, sum(apr)::int apr, sum(rep)::int rep
    from base group by rota, coloader
  ),
  media as (
    select case when (apr + rep) > 0 then apr::numeric / (apr + rep) else 0 end m from alt
  ),
  motivo_top as (
    select motivo, count(*)::int rep from base where rep = 1 group by motivo
    order by count(*) desc, motivo limit 1
  ),
  rota_topo as (
    select rota, vol from por_rota order by vol desc, rota limit 1
  )
  select jsonb_build_object(
    'alternativas', (
      select jsonb_build_object(
        'total', total, 'aprovadas', apr, 'reprovadas', rep, 'em_analise', ema,
        'taxa_aprovacao', case when (apr + rep) > 0 then apr::numeric / (apr + rep) else 0 end,
        'taxa_reprovacao', case when (apr + rep) > 0 then rep::numeric / (apr + rep) else 0 end,
        'clientes', clientes, 'rotas', rotas, 'coloaders', coloaders)
      from alt),
    'ofertas_unicas', (
      select jsonb_build_object(
        'total', total, 'aprovadas', apr, 'reprovadas', rep, 'em_analise', ema,
        'taxa_aprovacao', case when (apr + rep) > 0 then apr::numeric / (apr + rep) else 0 end,
        'taxa_reprovacao', case when (apr + rep) > 0 then rep::numeric / (apr + rep) else 0 end)
      from ofu),
    'evolucao_mensal', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'mes', mes, 'rotas', rotas, 'aprovadas', apr, 'reprovadas', rep,
        'conversao', case when (apr + rep) > 0 then apr::numeric / (apr + rep) else 0 end)), '[]'::jsonb)
      from mes),
    'oportunidades', jsonb_build_object(
      'rota_baixo', (
        select jsonb_build_object('item', rota, 'volume', vol,
          'conversao', apr::numeric / (apr + rep))
        from por_rota
        where (apr + rep) >= p_min_decisoes
          and apr::numeric / (apr + rep) < (select m from media)
        order by vol desc, apr::numeric / (apr + rep) limit 1),
      'cliente_baixo', (
        select jsonb_build_object('item', cliente, 'volume', vol,
          'conversao', apr::numeric / (apr + rep))
        from por_cliente
        where (apr + rep) >= p_min_decisoes
          and apr::numeric / (apr + rep) < (select m from media)
        order by vol desc, apr::numeric / (apr + rep) limit 1),
      'melhor_rota_coloader', (
        select jsonb_build_object('rota', rota, 'coloader', coloader,
          'conversao', apr::numeric / (apr + rep), 'decisoes', apr + rep)
        from combo
        where (apr + rep) >= p_min_decisoes
        order by apr::numeric / (apr + rep) desc, (apr + rep) desc limit 1),
      'motivo_recorrente', (
        select jsonb_build_object('motivo', motivo, 'reprovacoes', rep,
          'pct', case when (select rep from alt) > 0 then rep::numeric / (select rep from alt) else 0 end)
        from motivo_top),
      'concentracao', (
        select jsonb_build_object('rota', c.rota, 'coloader', c.coloader,
          'concentracao', c.vol::numeric / r.vol, 'volume_rota', r.vol)
        from rota_topo r
        join combo c on c.rota = r.rota
        order by c.vol desc, c.coloader limit 1)
    )
  );
$$;

revoke execute on function public.dashboard_analise(date, date, text, text, text, text, text, text, text, text, text, integer) from public, anon;
grant execute on function public.dashboard_analise(date, date, text, text, text, text, text, text, text, text, text, integer) to authenticated;