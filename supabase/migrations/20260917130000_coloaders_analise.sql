-- Ficha analítica da tela Coloaders / Armadores (aba COLOADER da planilha).
-- Agregações no banco; Produto garantido pela RLS de public.ofertas
-- via security_invoker em v_ofertas_analitico.

create or replace function public.coloaders_opcoes_filtro()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'coloaders',
    coalesce(
      (
        select jsonb_agg(v order by v)
        from (
          select distinct coloader_analitico as v
          from public.v_ofertas_analitico
        ) s
      ),
      '[]'::jsonb
    )
  );
$$;

create or replace function public.coloaders_analise(
  p_coloader text default 'Todos'
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
  -- Oportunidades Rota × Cliente: ordena por reprovações desc, depois volume desc.
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

revoke all on function public.coloaders_opcoes_filtro() from public, anon;
revoke all on function public.coloaders_analise(text) from public, anon;
grant execute on function public.coloaders_opcoes_filtro() to authenticated;
grant execute on function public.coloaders_analise(text) to authenticated;
