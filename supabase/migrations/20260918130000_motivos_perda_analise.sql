-- Ficha analítica da tela Motivos de Perda (aba MOTIVOS_PERDA da planilha).
-- Agregações no banco; Produto garantido pela RLS de public.ofertas
-- via security_invoker em v_ofertas_analitico.
-- Inclui_Filtro ≈ produto is not null (já filtrado na view / RLS).

-- Lista de motivos disponíveis no seletor ($B$4).
create or replace function public.motivos_perda_opcoes_filtro()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'motivos',
    coalesce(
      (
        select jsonb_agg(v order by v)
        from (
          select distinct motivo_perda_analitico as v
          from public.v_ofertas_analitico
          where flag_reprovada = 1
        ) s
      ),
      '[]'::jsonb
    )
  );
$$;

-- Análise completa do recorte de motivo de reprovação.
create or replace function public.motivos_perda_analise(
  p_motivo text default 'Todos'
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
  ),
  -- Total de reprovações filtradas (denominador de % das reprovações / evolução).
  todas_reprov as (
    select * from base_hist where flag_reprovada = 1
  ),
  -- Recorte do motivo selecionado (c da planilha).
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
  -- Rankings top 10 (mesma regra: agrupar, contar, ordenar DESC, TAKE 10).
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
  -- Principais (1º do ranking completo, não só top 10).
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
  -- Evolução mensal: n do motivo / total de reprovações do mês (sem filtro de motivo).
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

revoke all on function public.motivos_perda_opcoes_filtro() from public, anon;
revoke all on function public.motivos_perda_analise(text) from public, anon;
grant execute on function public.motivos_perda_opcoes_filtro() to authenticated;
grant execute on function public.motivos_perda_analise(text) to authenticated;
