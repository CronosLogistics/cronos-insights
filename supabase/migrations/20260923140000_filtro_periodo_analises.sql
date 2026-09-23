-- Filtro opcional por ano(s) e mes(es) em todas as fichas analiticas.
-- NULL ou array vazio em p_anos / p_meses = sem restricao.

-- Inclui data_abertura na view analítica para filtrar sem join extra.
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
  coalesce(
    nullif(regexp_replace(btrim(o.pricing), '\s+', ' ', 'g'), ''),
    '(Não informado)'
  ) as analista_pricing,
  coalesce(nullif(btrim(o.motivo), ''), '(Não informado)') as motivo_perda_analitico,
  (o.analise = 'Aprovado')::integer as flag_aprovada,
  (o.analise = 'Reprovado')::integer as flag_reprovada,
  (o.analise = 'Em Aberto')::integer as flag_em_analise,
  coalesce(nullif(btrim(o.pais_origem), ''), '(Não informado)') as pais_origem,
  coalesce(nullif(btrim(o.origem), ''), '(Não informado)') as porto_origem,
  coalesce(nullif(btrim(o.pais_destino), ''), '(Não informado)') as pais_destino,
  coalesce(nullif(btrim(o.destino), ''), '(Não informado)') as porto_destino,
  o.data_abertura,
  o.ano,
  o.mes
from public.ofertas o
where o.produto is not null;

grant select on public.v_ofertas_analitico to authenticated;

-- ---------------------------------------------------------------------------
-- Rotas
-- ---------------------------------------------------------------------------
drop function if exists public.rotas_analise(text, text, text, text, text);
drop function if exists public.rotas_analise(text, text, text, text, text, date, date);

create or replace function public.rotas_analise(
  p_pais_origem text default 'Todos',
  p_porto_origem text default 'Todos',
  p_pais_destino text default 'Todos',
  p_porto_destino text default 'Todos',
  p_rota text default 'Todos',
  p_anos integer[] default null,
  p_meses integer[] default null
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
      and (p_anos is null or coalesce(cardinality(p_anos), 0) = 0
        or coalesce(ano, extract(year from data_abertura)::int) = any(p_anos))
      and (p_meses is null or coalesce(cardinality(p_meses), 0) = 0
        or coalesce(mes, extract(month from data_abertura)::int) = any(p_meses))
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

revoke all on function public.rotas_analise(text, text, text, text, text, integer[], integer[]) from public, anon;
grant execute on function public.rotas_analise(text, text, text, text, text, integer[], integer[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Agentes
-- ---------------------------------------------------------------------------
drop function if exists public.agentes_analise(text);
drop function if exists public.agentes_analise(text, date, date);

create or replace function public.agentes_analise(
  p_agente text default 'Todos',
  p_anos integer[] default null,
  p_meses integer[] default null
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
      and (p_anos is null or coalesce(cardinality(p_anos), 0) = 0
        or coalesce(ano, extract(year from data_abertura)::int) = any(p_anos))
      and (p_meses is null or coalesce(cardinality(p_meses), 0) = 0
        or coalesce(mes, extract(month from data_abertura)::int) = any(p_meses))
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

revoke all on function public.agentes_analise(text, integer[], integer[]) from public, anon;
grant execute on function public.agentes_analise(text, integer[], integer[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Analistas
-- ---------------------------------------------------------------------------
drop function if exists public.analistas_analise(text);
drop function if exists public.analistas_analise(text, date, date);

create or replace function public.analistas_analise(
  p_analista text default 'Todos',
  p_anos integer[] default null,
  p_meses integer[] default null
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
      p_analista = 'Todos'
      or analista_pricing = coalesce(
        nullif(regexp_replace(btrim(p_analista), '\s+', ' ', 'g'), ''),
        '(Não informado)'
      )
    )
      and (p_anos is null or coalesce(cardinality(p_anos), 0) = 0
        or coalesce(ano, extract(year from data_abertura)::int) = any(p_anos))
      and (p_meses is null or coalesce(cardinality(p_meses), 0) = 0
        or coalesce(mes, extract(month from data_abertura)::int) = any(p_meses))
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
  cli as (
    select cliente_analitico as item,
      count(*)::bigint as rotas,
      coalesce(sum(flag_aprovada), 0)::bigint as aprovadas,
      coalesce(sum(flag_reprovada), 0)::bigint as reprovadas,
      coalesce(sum(flag_em_analise), 0)::bigint as em_analise
    from base group by 1 order by 2 desc, 1 limit 10
  ),
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
  ag as (
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
  ra as (
    select rota_analitica as rota, agente_analitico as agente,
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
    'clientes', coalesce((select jsonb_agg(to_jsonb(c) order by c.rotas desc, c.item) from cli c), '[]'::jsonb),
    'rotas', coalesce((select jsonb_agg(to_jsonb(r) order by r.rotas desc, r.item) from rot r), '[]'::jsonb),
    'coloaders', coalesce((select jsonb_agg(to_jsonb(c) order by c.rotas desc, c.item) from col c), '[]'::jsonb),
    'agentes', coalesce((select jsonb_agg(to_jsonb(a) order by a.rotas desc, a.item) from ag a), '[]'::jsonb),
    'motivosTotal', (select total from mot_total),
    'motivos', coalesce((select jsonb_agg(to_jsonb(m) order by m.reprovadas desc, m.motivo) from mot m), '[]'::jsonb),
    'rotaAgente', coalesce((select jsonb_agg(to_jsonb(x) order by x.reprovadas desc, x.rotas desc, x.rota, x.agente) from ra x), '[]'::jsonb)
  );
$$;

revoke all on function public.analistas_analise(text, integer[], integer[]) from public, anon;
grant execute on function public.analistas_analise(text, integer[], integer[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Coloaders
-- ---------------------------------------------------------------------------
drop function if exists public.coloaders_analise(text);
drop function if exists public.coloaders_analise(text, date, date);

create or replace function public.coloaders_analise(
  p_coloader text default 'Todos',
  p_anos integer[] default null,
  p_meses integer[] default null
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
      p_coloader = 'Todos'
      or coloader_analitico = coalesce(
        nullif(btrim(p_coloader), ''),
        '(Não informado)'
      )
    )
      and (p_anos is null or coalesce(cardinality(p_anos), 0) = 0
        or coalesce(ano, extract(year from data_abertura)::int) = any(p_anos))
      and (p_meses is null or coalesce(cardinality(p_meses), 0) = 0
        or coalesce(mes, extract(month from data_abertura)::int) = any(p_meses))
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
  rot as (
    select rota_analitica as item,
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
  rc as (
    select rota_analitica as rota, cliente_analitico as cliente,
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
    'clientes', coalesce((select jsonb_agg(to_jsonb(c) order by c.rotas desc, c.item) from cli c), '[]'::jsonb),
    'agentes', coalesce((select jsonb_agg(to_jsonb(a) order by a.rotas desc, a.item) from age a), '[]'::jsonb),
    'motivosTotal', (select total from mot_total),
    'motivos', coalesce((select jsonb_agg(to_jsonb(m) order by m.reprovadas desc, m.motivo) from mot m), '[]'::jsonb),
    'rotaCliente', coalesce((select jsonb_agg(to_jsonb(x) order by x.reprovadas desc, x.rotas desc, x.rota, x.cliente) from rc x), '[]'::jsonb)
  );
$$;

revoke all on function public.coloaders_analise(text, integer[], integer[]) from public, anon;
grant execute on function public.coloaders_analise(text, integer[], integer[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Motivos de perda
-- ---------------------------------------------------------------------------
drop function if exists public.motivos_perda_analise(text);
drop function if exists public.motivos_perda_analise(text, date, date);

create or replace function public.motivos_perda_analise(
  p_motivo text default 'Todos',
  p_anos integer[] default null,
  p_meses integer[] default null
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with base_hist as (
    select
      v.*,
      case
        when o.ano is not null and o.mes between 1 and 12
          then make_date(o.ano::integer, o.mes::integer, 1)
        when o.mes_ano is not null and o.mes_ano >= 100001
          then make_date((o.mes_ano / 100)::integer, (o.mes_ano % 100)::integer, 1)
        else null
      end as mes_ref
    from public.v_ofertas_analitico v
    join public.ofertas o on o.id = v.id
    where (p_anos is null or coalesce(cardinality(p_anos), 0) = 0
        or coalesce(v.ano, extract(year from v.data_abertura)::int) = any(p_anos))
      and (p_meses is null or coalesce(cardinality(p_meses), 0) = 0
        or coalesce(v.mes, extract(month from v.data_abertura)::int) = any(p_meses))
  ),
  todas_reprov as (
    select * from base_hist where flag_reprovada = 1
  ),
  base as (
    select *
    from todas_reprov
    where (
      p_motivo = 'Todos'
      or motivo_perda_analitico = coalesce(nullif(btrim(p_motivo), ''), '(Não informado)')
    )
  ),
  ind as (
    select
      count(*)::bigint as reprovacoes,
      count(distinct rota_analitica)::bigint as rotas,
      count(distinct cliente_analitico)::bigint as clientes,
      count(distinct coloader_analitico)::bigint as coloaders,
      count(distinct agente_analitico)::bigint as agentes,
      count(distinct mes_ref)::bigint as meses
    from base
  ),
  total_reprov as (
    select count(*)::bigint as total from todas_reprov
  ),
  por_rota as (
    select rota_analitica as item, count(*)::bigint as reprovacoes
    from base
    group by 1
    order by 2 desc, 1
    limit 10
  ),
  por_cliente as (
    select cliente_analitico as item, count(*)::bigint as reprovacoes
    from base
    group by 1
    order by 2 desc, 1
    limit 10
  ),
  por_coloader as (
    select coloader_analitico as item, count(*)::bigint as reprovacoes
    from base
    group by 1
    order by 2 desc, 1
    limit 10
  ),
  por_agente as (
    select agente_analitico as item, count(*)::bigint as reprovacoes
    from base
    group by 1
    order by 2 desc, 1
    limit 10
  ),
  principal_rota as (
    select rota_analitica as item
    from base
    group by 1
    order by count(*) desc, 1
    limit 1
  ),
  principal_cliente as (
    select cliente_analitico as item
    from base
    group by 1
    order by count(*) desc, 1
    limit 1
  ),
  principal_coloader as (
    select coloader_analitico as item
    from base
    group by 1
    order by count(*) desc, 1
    limit 1
  ),
  principal_agente as (
    select agente_analitico as item
    from base
    group by 1
    order by count(*) desc, 1
    limit 1
  ),
  rota_cliente as (
    select
      rota_analitica as rota,
      cliente_analitico as cliente,
      count(*)::bigint as reprovacoes
    from base
    group by 1, 2
    order by 3 desc, 1, 2
    limit 10
  ),
  totais_mes as (
    select mes_ref, count(*)::bigint as total_mes
    from todas_reprov
    where mes_ref is not null
    group by mes_ref
  ),
  evolucao as (
    select
      b.mes_ref as mes,
      count(*)::bigint as reprovacoes,
      max(t.total_mes)::bigint as total_mes
    from base b
    join totais_mes t on t.mes_ref = b.mes_ref
    where b.mes_ref is not null
    group by b.mes_ref
    order by b.mes_ref
  )
  select jsonb_build_object(
    'indicadores', (
      select jsonb_build_object(
        'reprovacoes', i.reprovacoes,
        'pct_reprovacoes', case
          when t.total > 0 then i.reprovacoes::numeric / t.total::numeric
          else 0
        end,
        'rotas', i.rotas,
        'clientes', i.clientes,
        'coloaders', i.coloaders,
        'agentes', i.agentes,
        'meses', i.meses,
        'amostra', i.reprovacoes
      )
      from ind i
      cross join total_reprov t
    ),
    'perfil', jsonb_build_object(
      'principal_rota', coalesce((select item from principal_rota), '-'),
      'principal_cliente', coalesce((select item from principal_cliente), '-'),
      'principal_coloader', coalesce((select item from principal_coloader), '-'),
      'principal_agente', coalesce((select item from principal_agente), '-')
    ),
    'motivo_rota', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'item', r.item,
            'reprovacoes', r.reprovacoes,
            'pct_motivo', case
              when (select reprovacoes from ind) > 0
                then r.reprovacoes::numeric / (select reprovacoes from ind)::numeric
              else 0
            end
          )
          order by r.reprovacoes desc, r.item
        )
        from por_rota r
      ),
      '[]'::jsonb
    ),
    'motivo_cliente', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'item', r.item,
            'reprovacoes', r.reprovacoes,
            'pct_motivo', case
              when (select reprovacoes from ind) > 0
                then r.reprovacoes::numeric / (select reprovacoes from ind)::numeric
              else 0
            end
          )
          order by r.reprovacoes desc, r.item
        )
        from por_cliente r
      ),
      '[]'::jsonb
    ),
    'coloaders', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'item', r.item,
            'reprovacoes', r.reprovacoes,
            'pct_motivo', case
              when (select reprovacoes from ind) > 0
                then r.reprovacoes::numeric / (select reprovacoes from ind)::numeric
              else 0
            end
          )
          order by r.reprovacoes desc, r.item
        )
        from por_coloader r
      ),
      '[]'::jsonb
    ),
    'agentes', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'item', r.item,
            'reprovacoes', r.reprovacoes,
            'pct_motivo', case
              when (select reprovacoes from ind) > 0
                then r.reprovacoes::numeric / (select reprovacoes from ind)::numeric
              else 0
            end
          )
          order by r.reprovacoes desc, r.item
        )
        from por_agente r
      ),
      '[]'::jsonb
    ),
    'rota_cliente', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'rota', r.rota,
            'cliente', r.cliente,
            'reprovacoes', r.reprovacoes
          )
          order by r.reprovacoes desc, r.rota, r.cliente
        )
        from rota_cliente r
      ),
      '[]'::jsonb
    ),
    'evolucao_mensal', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'mes', e.mes,
            'reprovacoes', e.reprovacoes,
            'pct_mes', case
              when e.total_mes > 0 then e.reprovacoes::numeric / e.total_mes::numeric
              else 0
            end
          )
          order by e.mes
        )
        from evolucao e
      ),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.motivos_perda_analise(text, integer[], integer[]) from public, anon;
grant execute on function public.motivos_perda_analise(text, integer[], integer[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Qualidade de dados
-- ---------------------------------------------------------------------------
drop function if exists public.qualidade_dados_analise();
drop function if exists public.qualidade_dados_analise(date, date);

create or replace function public.qualidade_dados_analise(
  p_anos integer[] default null,
  p_meses integer[] default null
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with base as (
    select
      o.oferta,
      o.cliente,
      o.intermediario,
      o.revisao,
      o.rota,
      o.modalidade,
      o.incoterm,
      o.origem_carga,
      o.origem,
      o.destino,
      o.destino_final,
      o.vendedor,
      o.status,
      o.analise,
      o.motivo,
      o.descricao_motivo,
      o.data_fim_sales_support,
      o.armador,
      o.agente,
      o.data_abertura,
      o.container,
      o.validade_de,
      o.validade_ate,
      o.complemento_incoterm,
      o.data_conclusao,
      o.inside_sales,
      coalesce(nullif(btrim(o.armador), ''), '(Não informado)') as coloader_analitico,
      case
        when nullif(btrim(o.origem), '') is null
          or nullif(btrim(o.destino), '') is null
        then '(Rota incompleta)'
        else btrim(o.origem) || ' → ' || btrim(o.destino)
      end as rota_analitica,
      coalesce(nullif(btrim(o.motivo), ''), '(Não informado)') as motivo_perda_analitico,
      (o.analise = 'Reprovado')::integer as flag_reprovada
    from public.ofertas o
    where o.produto is not null
      and (p_anos is null or coalesce(cardinality(p_anos), 0) = 0
        or coalesce(o.ano, extract(year from o.data_abertura)::int) = any(p_anos))
      and (p_meses is null or coalesce(cardinality(p_meses), 0) = 0
        or coalesce(o.mes, extract(month from o.data_abertura)::int) = any(p_meses))
  ),
  totais as (
    select
      count(*)::bigint as linhas_base,
      count(distinct oferta)::bigint as ofertas_unicas,
      count(*) filter (where coloader_analitico = '(Não informado)')::bigint
        as armador_nao_informado,
      count(*) filter (
        where flag_reprovada = 1
          and motivo_perda_analitico = '(Não informado)'
      )::bigint as motivo_ausente_reprovacoes,
      count(*) filter (where data_abertura is null)::bigint
        as data_abertura_ausente,
      count(*) filter (where rota_analitica = '(Rota incompleta)')::bigint
        as rota_incompleta,
      count(*) filter (
        where flag_reprovada = 1
          and (descricao_motivo is null or descricao_motivo = '')
      )::bigint as descricao_ausente_reprovacoes,
      0::bigint as p_selection_mode,
      count(*) filter (where oferta is not null and oferta <> '')::bigint as p_oferta,
      count(*) filter (where cliente is not null and cliente <> '')::bigint as p_pessoa,
      count(*) filter (where intermediario is not null and intermediario <> '')::bigint
        as p_intermediario,
      count(*) filter (where revisao is not null)::bigint as p_revisao,
      count(*) filter (where rota is not null and rota <> '')::bigint as p_rota,
      count(*) filter (where modalidade is not null and modalidade <> '')::bigint
        as p_modalidade,
      count(*) filter (where incoterm is not null and incoterm <> '')::bigint
        as p_incoterm,
      count(*) filter (where origem_carga is not null and origem_carga <> '')::bigint
        as p_origem_carga,
      count(*) filter (where origem is not null and origem <> '')::bigint as p_origem,
      count(*) filter (where destino is not null and destino <> '')::bigint as p_destino,
      count(*) filter (where destino_final is not null and destino_final <> '')::bigint
        as p_destino_final,
      count(*) filter (where vendedor is not null and vendedor <> '')::bigint
        as p_vendedor,
      count(*) filter (where status is not null and status <> '')::bigint as p_status,
      count(*) filter (where analise is not null and analise <> '')::bigint as p_analise,
      count(*) filter (where motivo is not null and motivo <> '')::bigint as p_motivo,
      count(*) filter (
        where descricao_motivo is not null and descricao_motivo <> ''
      )::bigint as p_descricao_motivo,
      count(*) filter (where data_fim_sales_support is not null)::bigint
        as p_data_fim_sales_support,
      0::bigint as p_validade_rota,
      count(*) filter (where armador is not null and armador <> '')::bigint as p_armador,
      count(*) filter (where agente is not null and agente <> '')::bigint as p_agente,
      count(*) filter (where data_abertura is not null)::bigint as p_data_abertura,
      count(*) filter (where container is not null and container <> '')::bigint
        as p_container,
      0::bigint as p_ft_venda,
      count(*) filter (where validade_de is not null)::bigint as p_validade_de,
      count(*) filter (where validade_ate is not null)::bigint as p_validade_ate,
      count(*) filter (
        where complemento_incoterm is not null and complemento_incoterm <> ''
      )::bigint as p_complemento_incoterm,
      count(*) filter (where data_conclusao is not null)::bigint as p_data_analise,
      count(*) filter (where inside_sales is not null and inside_sales <> '')::bigint
        as p_inside_sales,
      0::bigint as p_tipo_cotacao
    from base
  )
  select jsonb_build_object(
    'linhas_base', linhas_base,
    'indicadores', jsonb_build_array(
      jsonb_build_object(
        'indicador', 'linhas da base',
        'quantidade', linhas_base,
        'impacto', 'alternativas de rota'
      ),
      jsonb_build_object(
        'indicador', 'ofertas unicas',
        'quantidade', ofertas_unicas,
        'impacto', 'numeros de oferta distintos'
      ),
      jsonb_build_object(
        'indicador', 'armador nao informado',
        'quantidade', armador_nao_informado,
        'impacto', 'limita analise de coloader'
      ),
      jsonb_build_object(
        'indicador', 'motivo ausente em reprovacoes',
        'quantidade', motivo_ausente_reprovacoes,
        'impacto', 'limita diagnostico de reprovacoes'
      ),
      jsonb_build_object(
        'indicador', 'data de abertura ausente',
        'quantidade', data_abertura_ausente,
        'impacto', 'limita periodo e aging'
      ),
      jsonb_build_object(
        'indicador', 'rota incompleta',
        'quantidade', rota_incompleta,
        'impacto', 'origem ou destino ausente'
      ),
      jsonb_build_object(
        'indicador', 'descricao ausente nas reprovacoes',
        'quantidade', descricao_ausente_reprovacoes,
        'impacto', 'limita analise qualitativa'
      )
    ),
    'campos', jsonb_build_array(
      jsonb_build_object('campo', 'selectionMode', 'preenchidos', p_selection_mode),
      jsonb_build_object('campo', 'oferta', 'preenchidos', p_oferta),
      jsonb_build_object('campo', 'pessoa', 'preenchidos', p_pessoa),
      jsonb_build_object('campo', 'intermediário', 'preenchidos', p_intermediario),
      jsonb_build_object('campo', 'revisao', 'preenchidos', p_revisao),
      jsonb_build_object('campo', 'rota', 'preenchidos', p_rota),
      jsonb_build_object('campo', 'modalidade', 'preenchidos', p_modalidade),
      jsonb_build_object('campo', 'incoterm', 'preenchidos', p_incoterm),
      jsonb_build_object('campo', 'origem de carga', 'preenchidos', p_origem_carga),
      jsonb_build_object('campo', 'origem', 'preenchidos', p_origem),
      jsonb_build_object('campo', 'destino', 'preenchidos', p_destino),
      jsonb_build_object('campo', 'destino final', 'preenchidos', p_destino_final),
      jsonb_build_object('campo', 'vendedor', 'preenchidos', p_vendedor),
      jsonb_build_object('campo', 'status', 'preenchidos', p_status),
      jsonb_build_object('campo', 'analise', 'preenchidos', p_analise),
      jsonb_build_object('campo', 'motivo', 'preenchidos', p_motivo),
      jsonb_build_object('campo', 'descricao do motivo', 'preenchidos', p_descricao_motivo),
      jsonb_build_object(
        'campo', 'data fim sales support', 'preenchidos', p_data_fim_sales_support
      ),
      jsonb_build_object('campo', 'validade rota', 'preenchidos', p_validade_rota),
      jsonb_build_object('campo', 'armador', 'preenchidos', p_armador),
      jsonb_build_object('campo', 'agente', 'preenchidos', p_agente),
      jsonb_build_object('campo', 'data abertura', 'preenchidos', p_data_abertura),
      jsonb_build_object('campo', 'container', 'preenchidos', p_container),
      jsonb_build_object('campo', 'ft. venda', 'preenchidos', p_ft_venda),
      jsonb_build_object('campo', 'validade de', 'preenchidos', p_validade_de),
      jsonb_build_object('campo', 'validade ate', 'preenchidos', p_validade_ate),
      jsonb_build_object(
        'campo', 'complemento de incoterm', 'preenchidos', p_complemento_incoterm
      ),
      jsonb_build_object('campo', 'data analise', 'preenchidos', p_data_analise),
      jsonb_build_object(
        'campo',
        'responsavel comercial/inside sales',
        'preenchidos',
        p_inside_sales
      ),
      jsonb_build_object('campo', 'tipo cotação', 'preenchidos', p_tipo_cotacao)
    )
  )
  from totais;
$$;

revoke all on function public.qualidade_dados_analise(integer[], integer[]) from public, anon;
grant execute on function public.qualidade_dados_analise(integer[], integer[]) to authenticated;
