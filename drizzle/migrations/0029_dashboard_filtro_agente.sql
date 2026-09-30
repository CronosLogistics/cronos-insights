CREATE INDEX IF NOT EXISTS ofertas_produto_agente_oferta_idx ON public.ofertas (produto, agente, oferta);

CREATE OR REPLACE FUNCTION public.dashboard_analise_agente(p_data_inicial date DEFAULT NULL::date, p_data_final date DEFAULT NULL::date, p_analista text DEFAULT 'Todos'::text, p_vendedor text DEFAULT 'Todos'::text, p_cliente text DEFAULT 'Todos'::text, p_origem text DEFAULT 'Todos'::text, p_destino text DEFAULT 'Todos'::text, p_rota text DEFAULT 'Todos'::text, p_coloader text DEFAULT 'Todos'::text, p_resultado text DEFAULT 'Todos'::text, p_motivo text DEFAULT 'Todos'::text, p_min_decisoes integer DEFAULT 5, p_agente text DEFAULT 'Todos'::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'analitico'
 SET work_mem TO '64MB'
AS $function$
  with base as materialized (
    select b.oferta, b.cliente, b.rota, b.coloader, b.motivo,
           b.apr, b.rep, b.ema, b.mes
    from analitico.mv_dashboard_base b
    where b.produto = ANY (public.produtos_do_usuario())
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
      and (coalesce(p_agente, 'Todos') = 'Todos' or b.oferta in (
        select o.oferta from public.ofertas o
        where o.produto = ANY (public.produtos_do_usuario()) and o.agente = p_agente))
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
$function$;

GRANT EXECUTE ON FUNCTION public.dashboard_analise_agente(date, date, text, text, text, text, text, text, text, text, text, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_analise_frete_agente(p_data_inicial date DEFAULT NULL::date, p_data_final date DEFAULT NULL::date, p_analista text DEFAULT 'Todos'::text, p_vendedor text DEFAULT 'Todos'::text, p_cliente text DEFAULT 'Todos'::text, p_origem text DEFAULT 'Todos'::text, p_destino text DEFAULT 'Todos'::text, p_rota text DEFAULT 'Todos'::text, p_coloader text DEFAULT 'Todos'::text, p_resultado text DEFAULT 'Todos'::text, p_motivo text DEFAULT 'Todos'::text, p_min_decisoes integer DEFAULT 5, p_modalidade text DEFAULT 'Todos'::text, p_agente text DEFAULT 'Todos'::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'analitico'
 SET work_mem TO '64MB'
AS $function$
  with base as materialized (
    select b.oferta, b.cliente, b.rota, b.coloader, b.motivo,
           b.apr, b.rep, b.ema, b.mes
    from analitico.mv_dashboard_frete b
    where b.produto = ANY (public.produtos_do_usuario()) and b.modalidade_f = p_modalidade
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
      and (coalesce(p_agente, 'Todos') = 'Todos' or b.oferta in (
        select o.oferta from public.ofertas o
        where o.produto = ANY (public.produtos_do_usuario()) and o.agente = p_agente))
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
$function$;

GRANT EXECUTE ON FUNCTION public.dashboard_analise_frete_agente(date, date, text, text, text, text, text, text, text, text, text, integer, text, text) TO authenticated;