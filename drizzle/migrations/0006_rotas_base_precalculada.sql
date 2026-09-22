CREATE MATERIALIZED VIEW IF NOT EXISTS analitico.mv_rota_base AS
SELECT o.produto,
       o.oferta,
       COALESCE(NULLIF(btrim(o.cliente), ''), '(Não informado)') AS cliente,
       (COALESCE(NULLIF(btrim(o.origem), ''), 'Não informado') || ' → ' || COALESCE(NULLIF(btrim(o.destino), ''), 'Não informado')) AS rota,
       COALESCE(NULLIF(btrim(o.armador), ''), '(Não informado)') AS coloader,
       COALESCE(NULLIF(btrim(o.agente), ''), '(Não informado)') AS agente,
       COALESCE(NULLIF(btrim(o.motivo), ''), '(Não informado)') AS motivo,
       COALESCE(NULLIF(btrim(o.pais_origem), ''), '(Não informado)') AS pais_origem,
       COALESCE(NULLIF(btrim(o.origem), ''), '(Não informado)') AS porto_origem,
       COALESCE(NULLIF(btrim(o.pais_destino), ''), '(Não informado)') AS pais_destino,
       COALESCE(NULLIF(btrim(o.destino), ''), '(Não informado)') AS porto_destino,
       (o.analise = 'Aprovado')::int AS apr,
       (o.analise = 'Reprovado')::int AS rep,
       (o.analise = 'Em Aberto')::int AS ema
FROM public.ofertas o
WHERE o.produto IS NOT NULL;

CREATE INDEX IF NOT EXISTS mv_rota_base_produto_idx ON analitico.mv_rota_base (produto);
CREATE INDEX IF NOT EXISTS mv_rota_base_rota_idx ON analitico.mv_rota_base (produto, rota);
CREATE INDEX IF NOT EXISTS mv_rota_base_origem_idx ON analitico.mv_rota_base (produto, pais_origem, porto_origem);
CREATE INDEX IF NOT EXISTS mv_rota_base_destino_idx ON analitico.mv_rota_base (produto, pais_destino, porto_destino);

CREATE OR REPLACE FUNCTION public.rotas_opcoes_filtro()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'analitico'
AS $function$
  with b as (
    select distinct pais_origem, porto_origem, pais_destino, porto_destino, rota
    from analitico.mv_rota_base
    where produto = ANY (public.produtos_do_usuario())
  )
  select jsonb_build_object(
    'paisesOrigem', (select coalesce(jsonb_agg(distinct pais_origem order by pais_origem), '[]'::jsonb) from b),
    'portosOrigem', (select coalesce(jsonb_agg(distinct porto_origem order by porto_origem), '[]'::jsonb) from b),
    'paisesDestino', (select coalesce(jsonb_agg(distinct pais_destino order by pais_destino), '[]'::jsonb) from b),
    'portosDestino', (select coalesce(jsonb_agg(distinct porto_destino order by porto_destino), '[]'::jsonb) from b),
    'rotas', (select coalesce(jsonb_agg(distinct rota order by rota), '[]'::jsonb) from b)
  );
$function$;

CREATE OR REPLACE FUNCTION public.rotas_analise(p_pais_origem text DEFAULT 'Todos'::text, p_porto_origem text DEFAULT 'Todos'::text, p_pais_destino text DEFAULT 'Todos'::text, p_porto_destino text DEFAULT 'Todos'::text, p_rota text DEFAULT 'Todos'::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'analitico'
AS $function$
  with base as materialized (
    select oferta, cliente, rota, coloader, agente, motivo, apr, rep, ema
    from analitico.mv_rota_base
    where produto = ANY (public.produtos_do_usuario())
      and (p_pais_origem = 'Todos' or pais_origem = p_pais_origem)
      and (p_porto_origem = 'Todos' or porto_origem = p_porto_origem)
      and (p_pais_destino = 'Todos' or pais_destino = p_pais_destino)
      and (p_porto_destino = 'Todos' or porto_destino = p_porto_destino)
      and (p_rota = 'Todos' or rota = p_rota)
  ),
  ind as (
    select count(*)::bigint as rotas,
      count(distinct nullif(btrim(coalesce(oferta, '')), ''))::bigint as ofertas,
      count(distinct cliente)::bigint as clientes,
      count(distinct rota)::bigint as rotas_distintas,
      count(distinct coloader)::bigint as coloaders,
      coalesce(sum(apr), 0)::bigint as aprovadas,
      coalesce(sum(rep), 0)::bigint as reprovadas,
      coalesce(sum(ema), 0)::bigint as em_analise
    from base
  ),
  col as (
    select coloader as item, count(*)::bigint as rotas,
      coalesce(sum(apr), 0)::bigint as aprovadas,
      coalesce(sum(rep), 0)::bigint as reprovadas,
      coalesce(sum(ema), 0)::bigint as em_analise
    from base group by 1
  ),
  cli as (
    select cliente as item, count(*)::bigint as rotas,
      coalesce(sum(apr), 0)::bigint as aprovadas,
      coalesce(sum(rep), 0)::bigint as reprovadas,
      coalesce(sum(ema), 0)::bigint as em_analise
    from base group by 1 order by 2 desc, 1 limit 10
  ),
  age as (
    select agente as item, count(*)::bigint as rotas,
      coalesce(sum(apr), 0)::bigint as aprovadas,
      coalesce(sum(rep), 0)::bigint as reprovadas,
      coalesce(sum(ema), 0)::bigint as em_analise
    from base group by 1 order by 2 desc, 1 limit 10
  ),
  mot_total as (select coalesce(sum(rep), 0)::bigint as total from base),
  mot as (
    select motivo, count(*)::bigint as reprovadas
    from base where rep = 1 group by 1 order by 2 desc, 1 limit 10
  ),
  cc as (
    select cliente, coloader, count(*)::bigint as rotas,
      coalesce(sum(apr), 0)::bigint as aprovadas,
      coalesce(sum(rep), 0)::bigint as reprovadas,
      coalesce(sum(ema), 0)::bigint as em_analise
    from base group by 1, 2 order by 5 desc, 3 desc, 1, 2 limit 10
  ),
  media as (
    select coalesce(sum(aprovadas), 0)::bigint aprovadas, coalesce(sum(reprovadas), 0)::bigint reprovadas
    from analitico.mv_cliente_media_geral
    where produto = ANY (public.produtos_do_usuario())
  )
  select jsonb_build_object(
    'indicadores', (select to_jsonb(ind) from ind),
    'mediaAprovadas', (select aprovadas from media),
    'mediaReprovadas', (select reprovadas from media),
    'coloaders', coalesce((select jsonb_agg(to_jsonb(c) order by c.rotas desc, c.item) from col c), '[]'::jsonb),
    'clientes', coalesce((select jsonb_agg(to_jsonb(c) order by c.rotas desc, c.item) from cli c), '[]'::jsonb),
    'agentes', coalesce((select jsonb_agg(to_jsonb(a) order by a.rotas desc, a.item) from age a), '[]'::jsonb),
    'motivosTotal', (select total from mot_total),
    'motivos', coalesce((select jsonb_agg(to_jsonb(m) order by m.reprovadas desc, m.motivo) from mot m), '[]'::jsonb),
    'clienteColoader', coalesce((select jsonb_agg(to_jsonb(x) order by x.reprovadas desc, x.rotas desc, x.cliente, x.coloader) from cc x), '[]'::jsonb)
  );
$function$;

CREATE OR REPLACE FUNCTION public.atualizar_analises()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'analitico'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW analitico.mv_kpis_geral;
  REFRESH MATERIALIZED VIEW analitico.mv_ofertas_mensal;
  REFRESH MATERIALIZED VIEW analitico.mv_rotas;
  REFRESH MATERIALIZED VIEW analitico.mv_clientes;
  REFRESH MATERIALIZED VIEW analitico.mv_coloaders;
  REFRESH MATERIALIZED VIEW analitico.mv_agentes;
  REFRESH MATERIALIZED VIEW analitico.mv_analistas;
  REFRESH MATERIALIZED VIEW analitico.mv_vendedores;
  REFRESH MATERIALIZED VIEW analitico.mv_motivos_perda;
  REFRESH MATERIALIZED VIEW analitico.mv_qualidade_dados;
  REFRESH MATERIALIZED VIEW analitico.mv_qualidade_resumo;
  REFRESH MATERIALIZED VIEW analitico.mv_cliente_lista;
  REFRESH MATERIALIZED VIEW analitico.mv_cliente_media_geral;
  REFRESH MATERIALIZED VIEW analitico.mv_dashboard_base;
  REFRESH MATERIALIZED VIEW analitico.mv_dashboard_resumo;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_ind;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_cliente;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_rota;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_coloader;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_agente;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_motivo;
  REFRESH MATERIALIZED VIEW analitico.mv_analista_rota_agente;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_ind;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_rota;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_cliente;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_coloader;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_agente;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_rota_cliente;
  REFRESH MATERIALIZED VIEW analitico.mv_motivo_mes;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_base;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_ind;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_cliente;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_rota;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_coloader;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_motivo;
  REFRESH MATERIALIZED VIEW analitico.mv_agente_rota_coloader;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_base;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_ind;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_cliente;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_rota;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_agente;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_motivo;
  REFRESH MATERIALIZED VIEW analitico.mv_coloader_rota_cliente;
  REFRESH MATERIALIZED VIEW analitico.mv_rota_base;
END;
$function$;