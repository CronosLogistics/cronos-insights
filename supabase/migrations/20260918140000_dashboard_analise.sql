-- Dashboard analítico (aba DASHBOARD da planilha ANALISE COTAÇÕES).
-- Agregações no banco; Produto garantido pela RLS de public.ofertas
-- via security_invoker em v_ofertas_analitico.
-- Inclui_Filtro ≈ produto is not null (já filtrado na view / RLS).

create or replace function public.dashboard_opcoes_filtro()
returns jsonb
language sql
stable
set search_path = public
as $$
  with hist as (
    select
      v.analista_pricing,
      v.cliente_analitico,
      v.rota_analitica,
      v.coloader_analitico,
      v.motivo_perda_analitico,
      coalesce(nullif(btrim(o.vendedor), ''), '(Não informado)') as vendedor_analitico,
      coalesce(nullif(btrim(o.origem), ''), '(Não informado)') as origem,
      coalesce(nullif(btrim(o.destino), ''), '(Não informado)') as destino,
      case
        when o.analise = 'Em Aberto' then 'Em análise'
        else coalesce(nullif(btrim(o.analise), ''), '(Não informado)')
      end as resultado_oferta,
      o.data_abertura as data_base
    from public.v_ofertas_analitico v
    join public.ofertas o on o.id = v.id
  )
  select jsonb_build_object(
    'data_inicial', (select min(data_base)::text from hist where data_base is not null),
    'data_final', (select max(data_base)::text from hist where data_base is not null),
    'analistas', coalesce((select jsonb_agg(v order by v) from (select distinct analista_pricing as v from hist) s), '[]'::jsonb),
    'vendedores', coalesce((select jsonb_agg(v order by v) from (select distinct vendedor_analitico as v from hist) s), '[]'::jsonb),
    'clientes', coalesce((select jsonb_agg(v order by v) from (select distinct cliente_analitico as v from hist) s), '[]'::jsonb),
    'origens', coalesce((select jsonb_agg(v order by v) from (select distinct origem as v from hist) s), '[]'::jsonb),
    'destinos', coalesce((select jsonb_agg(v order by v) from (select distinct destino as v from hist) s), '[]'::jsonb),
    'rotas', coalesce((select jsonb_agg(v order by v) from (select distinct rota_analitica as v from hist) s), '[]'::jsonb),
    'coloaders', coalesce((select jsonb_agg(v order by v) from (select distinct coloader_analitico as v from hist) s), '[]'::jsonb),
    'resultados', coalesce((select jsonb_agg(v order by v) from (select distinct resultado_oferta as v from hist) s), '[]'::jsonb),
    'motivos', coalesce((select jsonb_agg(v order by v) from (select distinct motivo_perda_analitico as v from hist) s), '[]'::jsonb)
  );
$$;

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
set search_path = public
as $$
  with hist as (
    select
      v.id,
      v.oferta,
      v.cliente_analitico,
      v.rota_analitica,
      v.coloader_analitico,
      v.analista_pricing,
      v.motivo_perda_analitico,
      v.flag_aprovada,
      v.flag_reprovada,
      v.flag_em_analise,
      coalesce(nullif(btrim(o.vendedor), ''), '(Não informado)') as vendedor_analitico,
      coalesce(nullif(btrim(o.origem), ''), '(Não informado)') as origem,
      coalesce(nullif(btrim(o.destino), ''), '(Não informado)') as destino,
      case
        when o.analise = 'Em Aberto' then 'Em análise'
        else coalesce(nullif(btrim(o.analise), ''), '(Não informado)')
      end as resultado_oferta,
      o.data_abertura as data_base,
      case
        when o.ano is not null and o.mes between 1 and 12
          then make_date(o.ano::integer, o.mes::integer, 1)
        when o.mes_ano is not null and o.mes_ano >= 100001
          then make_date((o.mes_ano / 100)::integer, (o.mes_ano % 100)::integer, 1)
        when o.data_abertura is not null
          then date_trunc('month', o.data_abertura)::date
        else null
      end as mes_ref
    from public.v_ofertas_analitico v
    join public.ofertas o on o.id = v.id
  ),
  -- Inclui_Filtro = 1 + filtros globais do Dashboard.
  base as (
    select *
    from hist
    where
      (p_data_inicial is null or data_base >= p_data_inicial)
      and (p_data_final is null or data_base <= p_data_final)
      and (
        p_analista = 'Todos'
        or analista_pricing = coalesce(
          nullif(regexp_replace(btrim(p_analista), '\s+', ' ', 'g'), ''),
          '(Não informado)'
        )
      )
      and (
        p_vendedor = 'Todos'
        or vendedor_analitico = coalesce(
          nullif(regexp_replace(btrim(p_vendedor), '\s+', ' ', 'g'), ''),
          '(Não informado)'
        )
      )
      and (
        p_cliente = 'Todos'
        or cliente_analitico = coalesce(nullif(btrim(p_cliente), ''), '(Não informado)')
      )
      and (
        p_origem = 'Todos'
        or origem = coalesce(nullif(btrim(p_origem), ''), '(Não informado)')
      )
      and (
        p_destino = 'Todos'
        or destino = coalesce(nullif(btrim(p_destino), ''), '(Não informado)')
      )
      and (
        p_rota = 'Todos'
        or rota_analitica = coalesce(nullif(btrim(p_rota), ''), '(Rota incompleta)')
      )
      and (
        p_coloader = 'Todos'
        or coloader_analitico = coalesce(nullif(btrim(p_coloader), ''), '(Não informado)')
      )
      and (
        p_resultado = 'Todos'
        or resultado_oferta = coalesce(nullif(btrim(p_resultado), ''), '(Não informado)')
      )
      and (
        p_motivo = 'Todos'
        or motivo_perda_analitico = coalesce(nullif(btrim(p_motivo), ''), '(Não informado)')
      )
  ),
  -- Alternativas de rota (registros / revisões).
  alt as (
    select
      count(*)::bigint as total,
      coalesce(sum(flag_aprovada), 0)::bigint as aprovadas,
      coalesce(sum(flag_reprovada), 0)::bigint as reprovadas,
      coalesce(sum(flag_em_analise), 0)::bigint as em_analise,
      count(distinct cliente_analitico)::bigint as clientes,
      count(distinct rota_analitica)::bigint as rotas,
      count(distinct coloader_analitico)::bigint as coloaders
    from base
  ),
  alt_taxas as (
    select
      a.*,
      case
        when (a.aprovadas + a.reprovadas) = 0 then 0::float8
        else a.aprovadas::float8 / (a.aprovadas + a.reprovadas)::float8
      end as taxa_aprovacao,
      case
        when (a.aprovadas + a.reprovadas) = 0 then 0::float8
        else a.reprovadas::float8 / (a.aprovadas + a.reprovadas)::float8
      end as taxa_reprovacao
    from alt a
  ),
  -- Ofertas únicas.
  of_total as (
    select count(distinct oferta)::bigint as total from base where oferta is not null
  ),
  of_aprov as (
    select count(distinct oferta)::bigint as n
    from base
    where oferta is not null and resultado_oferta = 'Aprovado'
  ),
  of_reprov as (
    select count(distinct oferta)::bigint as n
    from base
    where oferta is not null and resultado_oferta = 'Reprovado'
  ),
  of_analise as (
    select count(distinct oferta)::bigint as n
    from base
    where oferta is not null and resultado_oferta = 'Em análise'
  ),
  of_unicas as (
    select
      t.total,
      a.n as aprovadas,
      r.n as reprovadas,
      e.n as em_analise,
      case
        when (a.n + r.n) = 0 then 0::float8
        else a.n::float8 / (a.n + r.n)::float8
      end as taxa_aprovacao,
      case
        when (a.n + r.n) = 0 then 0::float8
        else r.n::float8 / (a.n + r.n)::float8
      end as taxa_reprovacao
    from of_total t, of_aprov a, of_reprov r, of_analise e
  ),
  -- Evolução mensal (mesma série do gráfico).
  evolucao as (
    select
      mes_ref,
      count(*)::bigint as rotas,
      coalesce(sum(flag_aprovada), 0)::bigint as aprovadas,
      coalesce(sum(flag_reprovada), 0)::bigint as reprovadas,
      case
        when coalesce(sum(flag_aprovada), 0) + coalesce(sum(flag_reprovada), 0) = 0
          then 0::float8
        else coalesce(sum(flag_aprovada), 0)::float8
          / (coalesce(sum(flag_aprovada), 0) + coalesce(sum(flag_reprovada), 0))::float8
      end as conversao
    from base
    where mes_ref is not null
    group by mes_ref
    order by mes_ref
  ),
  -- Oportunidade: rota alto volume + baixa conversão (vs taxa global E8).
  por_rota as (
    select
      rota_analitica as item,
      count(*)::bigint as volume,
      coalesce(sum(flag_aprovada), 0)::bigint as aprovadas,
      coalesce(sum(flag_reprovada), 0)::bigint as reprovadas
    from base
    group by 1
  ),
  por_rota_cv as (
    select
      item,
      volume,
      case
        when (aprovadas + reprovadas) = 0 then 0::float8
        else aprovadas::float8 / (aprovadas + reprovadas)::float8
      end as conversao
    from por_rota
  ),
  p75_rota as (
    select coalesce(percentile_cont(0.75) within group (order by volume), 0)::float8 as q
    from por_rota_cv
  ),
  rota_baixo as (
    select r.item, r.volume, r.conversao
    from por_rota_cv r
    cross join p75_rota p
    cross join alt_taxas a
    where r.volume >= p.q
      and r.conversao < a.taxa_aprovacao
    order by r.volume desc, r.item
    limit 1
  ),
  -- Oportunidade: cliente alto volume + baixa conversão.
  por_cliente as (
    select
      cliente_analitico as item,
      count(*)::bigint as volume,
      coalesce(sum(flag_aprovada), 0)::bigint as aprovadas,
      coalesce(sum(flag_reprovada), 0)::bigint as reprovadas
    from base
    group by 1
  ),
  por_cliente_cv as (
    select
      item,
      volume,
      case
        when (aprovadas + reprovadas) = 0 then 0::float8
        else aprovadas::float8 / (aprovadas + reprovadas)::float8
      end as conversao
    from por_cliente
  ),
  p75_cliente as (
    select coalesce(percentile_cont(0.75) within group (order by volume), 0)::float8 as q
    from por_cliente_cv
  ),
  cliente_baixo as (
    select c.item, c.volume, c.conversao
    from por_cliente_cv c
    cross join p75_cliente p
    cross join alt_taxas a
    where c.volume >= p.q
      and c.conversao < a.taxa_aprovacao
    order by c.volume desc, c.item
    limit 1
  ),
  -- Melhor rota + coloader (amostra >= TRATAMENTO!B5).
  por_rota_coloader as (
    select
      rota_analitica as rota,
      coloader_analitico as coloader,
      coalesce(sum(flag_aprovada), 0)::bigint as aprovadas,
      coalesce(sum(flag_reprovada), 0)::bigint as reprovadas
    from base
    group by 1, 2
  ),
  por_rota_coloader_cv as (
    select
      rota,
      coloader,
      (aprovadas + reprovadas)::bigint as decisoes,
      case
        when (aprovadas + reprovadas) = 0 then 0::float8
        else aprovadas::float8 / (aprovadas + reprovadas)::float8
      end as conversao
    from por_rota_coloader
  ),
  melhor_rc as (
    select rota, coloader, conversao, decisoes
    from por_rota_coloader_cv
    where decisoes >= greatest(coalesce(p_min_decisoes, 5), 1)
    order by conversao desc, decisoes desc, rota, coloader
    limit 1
  ),
  -- Motivo de reprovação recorrente (exclui "-" e equivalente vazio).
  por_motivo as (
    select
      motivo_perda_analitico as motivo,
      count(*)::bigint as reprovacoes
    from base
    where flag_reprovada = 1
      and motivo_perda_analitico is distinct from '-'
      and motivo_perda_analitico is distinct from '(Não informado)'
    group by 1
  ),
  total_motivo as (
    select coalesce(sum(reprovacoes), 0)::bigint as total from por_motivo
  ),
  motivo_top as (
    select
      m.motivo,
      m.reprovacoes,
      case
        when t.total = 0 then 0::float8
        else m.reprovacoes::float8 / t.total::float8
      end as pct
    from por_motivo m
    cross join total_motivo t
    order by m.reprovacoes desc, m.motivo
    limit 1
  ),
  -- Concentração de coloader por rota (rotas >= P75 de volume).
  vol_rota as (
    select rota_analitica as rota, count(*)::bigint as volume
    from base
    group by 1
  ),
  p75_vol_rota as (
    select coalesce(percentile_cont(0.75) within group (order by volume), 0)::float8 as q
    from vol_rota
  ),
  comb_rc as (
    select
      b.rota_analitica as rota,
      b.coloader_analitico as coloader,
      count(*)::bigint as n,
      vr.volume as volume_rota
    from base b
    join vol_rota vr on vr.rota = b.rota_analitica
    cross join p75_vol_rota p
    where vr.volume >= p.q
    group by 1, 2, vr.volume
  ),
  concentracao as (
    select
      rota,
      coloader,
      n,
      volume_rota,
      case when volume_rota = 0 then 0::float8 else n::float8 / volume_rota::float8 end as concentracao
    from comb_rc
    order by concentracao desc, volume_rota desc, rota, coloader
    limit 1
  )
  select jsonb_build_object(
    'alternativas',
    (
      select jsonb_build_object(
        'total', total,
        'aprovadas', aprovadas,
        'reprovadas', reprovadas,
        'em_analise', em_analise,
        'taxa_aprovacao', taxa_aprovacao,
        'taxa_reprovacao', taxa_reprovacao,
        'clientes', clientes,
        'rotas', rotas,
        'coloaders', coloaders
      )
      from alt_taxas
    ),
    'ofertas_unicas',
    (
      select jsonb_build_object(
        'total', total,
        'aprovadas', aprovadas,
        'reprovadas', reprovadas,
        'em_analise', em_analise,
        'taxa_aprovacao', taxa_aprovacao,
        'taxa_reprovacao', taxa_reprovacao
      )
      from of_unicas
    ),
    'evolucao_mensal',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'mes', mes_ref::text,
            'rotas', rotas,
            'aprovadas', aprovadas,
            'reprovadas', reprovadas,
            'conversao', conversao
          )
          order by mes_ref
        )
        from evolucao
      ),
      '[]'::jsonb
    ),
    'oportunidades',
    jsonb_build_object(
      'rota_baixo',
      (select jsonb_build_object('item', item, 'volume', volume, 'conversao', conversao) from rota_baixo),
      'cliente_baixo',
      (select jsonb_build_object('item', item, 'volume', volume, 'conversao', conversao) from cliente_baixo),
      'melhor_rota_coloader',
      (
        select jsonb_build_object(
          'rota', rota,
          'coloader', coloader,
          'conversao', conversao,
          'decisoes', decisoes
        )
        from melhor_rc
      ),
      'motivo_recorrente',
      (
        select jsonb_build_object(
          'motivo', motivo,
          'reprovacoes', reprovacoes,
          'pct', pct
        )
        from motivo_top
      ),
      'concentracao',
      (
        select jsonb_build_object(
          'rota', rota,
          'coloader', coloader,
          'concentracao', concentracao,
          'volume_rota', volume_rota
        )
        from concentracao
      )
    )
  );
$$;

grant execute on function public.dashboard_opcoes_filtro() to authenticated;
grant execute on function public.dashboard_analise(
  date, date, text, text, text, text, text, text, text, text, text, integer
) to authenticated;
