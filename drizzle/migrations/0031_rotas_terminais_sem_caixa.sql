CREATE OR REPLACE FUNCTION public.ofertas_por_mes(p_coloader text DEFAULT 'Todos'::text, p_agente text DEFAULT 'Todos'::text, p_analista text DEFAULT 'Todos'::text, p_motivo text DEFAULT 'Todos'::text, p_rota text DEFAULT 'Todos'::text, p_pais_origem text DEFAULT 'Todos'::text, p_porto_origem text DEFAULT 'Todos'::text, p_pais_destino text DEFAULT 'Todos'::text, p_porto_destino text DEFAULT 'Todos'::text, p_anos integer[] DEFAULT NULL::integer[], p_meses integer[] DEFAULT NULL::integer[], p_modalidade text DEFAULT 'Todos'::text, p_somente_reprovadas boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'analitico'
 SET work_mem TO '64MB'
AS $function$
  with base as (
    select ano_f, mes_f, oferta
    from analitico.mv_ofertas_frete_slim
    where produto = any(public.produtos_do_usuario())
      and (coalesce(p_modalidade,'Todos') = 'Todos' or modalidade_f = p_modalidade)
      and (coalesce(p_coloader,'Todos') = 'Todos' or coloader_analitico = p_coloader)
      and (coalesce(p_agente,'Todos') = 'Todos' or agente_analitico = p_agente)
      and (coalesce(p_analista,'Todos') = 'Todos' or analista_pricing = p_analista)
      and (coalesce(p_motivo,'Todos') = 'Todos' or motivo_perda_analitico = p_motivo)
      and (coalesce(p_rota,'Todos') = 'Todos' or upper(rota_analitica) = upper(p_rota))
      and (coalesce(p_pais_origem,'Todos') = 'Todos' or upper(pais_origem_f) = upper(p_pais_origem))
      and (coalesce(p_porto_origem,'Todos') = 'Todos' or upper(porto_origem) = upper(p_porto_origem))
      and (coalesce(p_pais_destino,'Todos') = 'Todos' or upper(pais_destino_f) = upper(p_pais_destino))
      and (coalesce(p_porto_destino,'Todos') = 'Todos' or upper(porto_destino) = upper(p_porto_destino))
      and (p_anos is null or cardinality(p_anos) = 0 or ano_f = any(p_anos))
      and (p_meses is null or cardinality(p_meses) = 0 or mes_f = any(p_meses))
      and (not p_somente_reprovadas or flag_reprovada = 1)
      and ano_f is not null and mes_f between 1 and 12
  ), agg as (
    select ano_f, mes_f, count(distinct oferta)::int ofertas, count(*)::int linhas
    from base group by 1, 2
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'mes', to_char(make_date(ano_f, mes_f, 1), 'YYYY-MM'), 'ofertas', ofertas, 'linhas', linhas)
    order by ano_f, mes_f), '[]'::jsonb)
  from agg;
$function$
;
CREATE OR REPLACE FUNCTION public.rotas_analise_frete(p_pais_origem text DEFAULT 'Todos'::text, p_porto_origem text DEFAULT 'Todos'::text, p_pais_destino text DEFAULT 'Todos'::text, p_porto_destino text DEFAULT 'Todos'::text, p_rota text DEFAULT 'Todos'::text, p_anos integer[] DEFAULT NULL::integer[], p_meses integer[] DEFAULT NULL::integer[], p_modalidade text DEFAULT 'Todos'::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'analitico'
 SET work_mem TO '64MB'
AS $function$ with base as materialized ( select * from analitico.mv_ofertas_frete_slim  where produto = any(public.produtos_do_usuario()) and modalidade_f = p_modalidade and (p_pais_origem = 'Todos' or upper(pais_origem_f) = upper(p_pais_origem)) and (p_porto_origem = 'Todos' or upper(porto_origem) = upper(p_porto_origem)) and (p_pais_destino = 'Todos' or upper(pais_destino_f) = upper(p_pais_destino)) and (p_porto_destino = 'Todos' or upper(porto_destino) = upper(p_porto_destino)) and (p_rota = 'Todos' or upper(rota_analitica) = upper(p_rota)) and (p_anos is null or coalesce(cardinality(p_anos), 0) = 0 or ano_f = any(p_anos)) and (p_meses is null or coalesce(cardinality(p_meses), 0) = 0 or mes_f = any(p_meses)) ), ind as ( select count(*)::bigint as rotas, count(distinct nullif(btrim(coalesce(oferta, '')), ''))::bigint as ofertas, count(distinct cliente_analitico)::bigint as clientes, count(distinct upper(rota_analitica))::bigint as rotas_distintas, count(distinct coloader_analitico)::bigint as coloaders, coalesce(sum(flag_aprovada), 0)::bigint as aprovadas, coalesce(sum(flag_reprovada), 0)::bigint as reprovadas, coalesce(sum(flag_em_analise), 0)::bigint as em_analise from base ), col as ( select coloader_analitico as item, count(*)::bigint as rotas, coalesce(sum(flag_aprovada), 0)::bigint as aprovadas, coalesce(sum(flag_reprovada), 0)::bigint as reprovadas, coalesce(sum(flag_em_analise), 0)::bigint as em_analise from base group by 1 ), cli as ( select cliente_analitico as item, count(*)::bigint as rotas, coalesce(sum(flag_aprovada), 0)::bigint as aprovadas, coalesce(sum(flag_reprovada), 0)::bigint as reprovadas, coalesce(sum(flag_em_analise), 0)::bigint as em_analise from base group by 1 order by 2 desc, 1 limit 10 ), age as ( select agente_analitico as item, count(*)::bigint as rotas, coalesce(sum(flag_aprovada), 0)::bigint as aprovadas, coalesce(sum(flag_reprovada), 0)::bigint as reprovadas, coalesce(sum(flag_em_analise), 0)::bigint as em_analise from base group by 1 order by 2 desc, 1 limit 10 ), mot_total as (select coalesce(sum(flag_reprovada), 0)::bigint as total from base), mot as ( select motivo_perda_analitico as motivo, count(*)::bigint as reprovadas from base where flag_reprovada = 1 group by 1 order by 2 desc, 1 limit 10 ), cc as ( select cliente_analitico as cliente, coloader_analitico as coloader, count(*)::bigint as rotas, coalesce(sum(flag_aprovada), 0)::bigint as aprovadas, coalesce(sum(flag_reprovada), 0)::bigint as reprovadas, coalesce(sum(flag_em_analise), 0)::bigint as em_analise from base group by 1, 2 order by 5 desc, 3 desc, 1, 2 limit 10 ) select jsonb_build_object( 'indicadores', (select to_jsonb(ind) from ind), 'mediaAprovadas', coalesce((select sum(aprovadas) from analitico.mv_cliente_media_geral where produto = any(public.produtos_do_usuario())), 0), 'mediaReprovadas', coalesce((select sum(reprovadas) from analitico.mv_cliente_media_geral where produto = any(public.produtos_do_usuario())), 0), 'coloaders', coalesce((select jsonb_agg(to_jsonb(c) order by c.rotas desc, c.item) from col c), '[]'::jsonb), 'clientes', coalesce((select jsonb_agg(to_jsonb(c) order by c.rotas desc, c.item) from cli c), '[]'::jsonb), 'agentes', coalesce((select jsonb_agg(to_jsonb(a) order by a.rotas desc, a.item) from age a), '[]'::jsonb), 'motivosTotal', (select total from mot_total), 'motivos', coalesce((select jsonb_agg(to_jsonb(m) order by m.reprovadas desc, m.motivo) from mot m), '[]'::jsonb), 'clienteColoader', coalesce((select jsonb_agg(to_jsonb(x) order by x.reprovadas desc, x.rotas desc, x.cliente, x.coloader) from cc x), '[]'::jsonb) ); $function$
;
CREATE OR REPLACE FUNCTION public.rotas_analise_padrao(p_pais_origem text DEFAULT 'Todos'::text, p_porto_origem text DEFAULT 'Todos'::text, p_pais_destino text DEFAULT 'Todos'::text, p_porto_destino text DEFAULT 'Todos'::text, p_rota text DEFAULT 'Todos'::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'analitico'
AS $function$
  with base as materialized (
    select oferta, cliente, rota, coloader, agente, motivo, apr, rep, ema
    from analitico.mv_rota_base
    where produto = ANY (public.produtos_do_usuario())
      and (p_pais_origem = 'Todos' or upper(pais_origem) = upper(p_pais_origem))
      and (p_porto_origem = 'Todos' or upper(porto_origem) = upper(p_porto_origem))
      and (p_pais_destino = 'Todos' or upper(pais_destino) = upper(p_pais_destino))
      and (p_porto_destino = 'Todos' or upper(porto_destino) = upper(p_porto_destino))
      and (p_rota = 'Todos' or upper(rota) = upper(p_rota))
  ),
  ind as (
    select count(*)::bigint as rotas,
      count(distinct nullif(btrim(coalesce(oferta, '')), ''))::bigint as ofertas,
      count(distinct cliente)::bigint as clientes,
      count(distinct upper(rota))::bigint as rotas_distintas,
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
$function$
;
CREATE OR REPLACE FUNCTION public.rotas_analise_periodo_calc(p_pais_origem text DEFAULT 'Todos'::text, p_porto_origem text DEFAULT 'Todos'::text, p_pais_destino text DEFAULT 'Todos'::text, p_porto_destino text DEFAULT 'Todos'::text, p_rota text DEFAULT 'Todos'::text, p_anos integer[] DEFAULT NULL::integer[], p_meses integer[] DEFAULT NULL::integer[])
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'analitico'
 SET work_mem TO '64MB'
AS $function$
WITH pr AS MATERIALIZED (SELECT public.produtos_do_usuario() AS p),
cc AS MATERIALIZED (SELECT m.cliente, m.coloader, m.rota, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise FROM analitico.mv_rota_per_cc m, pr WHERE m.produto = any(pr.p) AND (p_pais_origem='Todos' OR upper(m.pais_origem) = upper(p_pais_origem)) AND (p_porto_origem='Todos' OR upper(m.porto_origem) = upper(p_porto_origem)) AND (p_pais_destino='Todos' OR upper(m.pais_destino) = upper(p_pais_destino)) AND (p_porto_destino='Todos' OR upper(m.porto_destino) = upper(p_porto_destino)) AND (p_rota='Todos' OR upper(m.rota) = upper(p_rota)) AND (coalesce(cardinality(p_anos),0)=0 OR m.ano_f=any(p_anos)) AND (coalesce(cardinality(p_meses),0)=0 OR m.mes_f=any(p_meses)) GROUP BY 1,2,3),
ind AS (SELECT coalesce(sum(rotas),0)::bigint rotas, (SELECT count(DISTINCT m.oferta) FROM analitico.mv_rota_per_oferta m, pr WHERE m.produto = any(pr.p) AND (p_pais_origem='Todos' OR upper(m.pais_origem) = upper(p_pais_origem)) AND (p_porto_origem='Todos' OR upper(m.porto_origem) = upper(p_porto_origem)) AND (p_pais_destino='Todos' OR upper(m.pais_destino) = upper(p_pais_destino)) AND (p_porto_destino='Todos' OR upper(m.porto_destino) = upper(p_porto_destino)) AND (p_rota='Todos' OR upper(m.rota) = upper(p_rota)) AND (coalesce(cardinality(p_anos),0)=0 OR m.ano_f=any(p_anos)) AND (coalesce(cardinality(p_meses),0)=0 OR m.mes_f=any(p_meses)))::bigint ofertas, count(DISTINCT cliente)::bigint clientes, count(DISTINCT upper(rota))::bigint rotas_distintas, count(DISTINCT coloader)::bigint coloaders, coalesce(sum(aprovadas),0)::bigint aprovadas, coalesce(sum(reprovadas),0)::bigint reprovadas, coalesce(sum(em_analise),0)::bigint em_analise FROM cc),
col AS (SELECT coloader item, sum(rotas)::bigint rotas, sum(aprovadas)::bigint aprovadas, sum(reprovadas)::bigint reprovadas, sum(em_analise)::bigint em_analise FROM cc GROUP BY 1),
cli AS (SELECT cliente item, sum(rotas)::bigint rotas, sum(aprovadas)::bigint aprovadas, sum(reprovadas)::bigint reprovadas, sum(em_analise)::bigint em_analise FROM cc GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10),
age AS (SELECT m.agente item, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise FROM analitico.mv_rota_per_agente m, pr WHERE m.produto = any(pr.p) AND (p_pais_origem='Todos' OR upper(m.pais_origem) = upper(p_pais_origem)) AND (p_porto_origem='Todos' OR upper(m.porto_origem) = upper(p_porto_origem)) AND (p_pais_destino='Todos' OR upper(m.pais_destino) = upper(p_pais_destino)) AND (p_porto_destino='Todos' OR upper(m.porto_destino) = upper(p_porto_destino)) AND (p_rota='Todos' OR upper(m.rota) = upper(p_rota)) AND (coalesce(cardinality(p_anos),0)=0 OR m.ano_f=any(p_anos)) AND (coalesce(cardinality(p_meses),0)=0 OR m.mes_f=any(p_meses)) GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10),
mot AS (SELECT m.motivo, sum(m.reprovadas)::bigint reprovadas FROM analitico.mv_rota_per_motivo m, pr WHERE m.produto = any(pr.p) AND (p_pais_origem='Todos' OR upper(m.pais_origem) = upper(p_pais_origem)) AND (p_porto_origem='Todos' OR upper(m.porto_origem) = upper(p_porto_origem)) AND (p_pais_destino='Todos' OR upper(m.pais_destino) = upper(p_pais_destino)) AND (p_porto_destino='Todos' OR upper(m.porto_destino) = upper(p_porto_destino)) AND (p_rota='Todos' OR upper(m.rota) = upper(p_rota)) AND (coalesce(cardinality(p_anos),0)=0 OR m.ano_f=any(p_anos)) AND (coalesce(cardinality(p_meses),0)=0 OR m.mes_f=any(p_meses)) GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10),
cc2 AS (SELECT cliente, coloader, sum(rotas)::bigint rotas, sum(aprovadas)::bigint aprovadas, sum(reprovadas)::bigint reprovadas, sum(em_analise)::bigint em_analise FROM cc GROUP BY 1,2 ORDER BY 5 DESC, 3 DESC, 1, 2 LIMIT 10)
SELECT jsonb_build_object('indicadores',(SELECT to_jsonb(i) FROM ind i),
'mediaAprovadas', coalesce((SELECT sum(g.aprovadas) FROM analitico.mv_cliente_media_geral g, pr WHERE g.produto=any(pr.p)),0),
'mediaReprovadas', coalesce((SELECT sum(g.reprovadas) FROM analitico.mv_cliente_media_geral g, pr WHERE g.produto=any(pr.p)),0),
'coloaders', coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.rotas DESC, c.item) FROM col c),'[]'::jsonb),
'clientes', coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.rotas DESC, c.item) FROM cli c),'[]'::jsonb),
'agentes', coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.rotas DESC, a.item) FROM age a),'[]'::jsonb),
'motivosTotal', (SELECT reprovadas FROM ind),
'motivos', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.reprovadas DESC, x.motivo) FROM mot x),'[]'::jsonb),
'clienteColoader', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.reprovadas DESC, x.rotas DESC, x.cliente, x.coloader) FROM cc2 x),'[]'::jsonb)); $function$
;
CREATE OR REPLACE FUNCTION public.rotas_opcoes_filtro()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'public', 'analitico'
AS $function$
  WITH permitidas AS (
    SELECT o.* FROM analitico.mv_rota_opcoes o
    WHERE o.produto = ANY (public.produtos_do_usuario())
  ),
  vals AS (
    SELECT 'paisesOrigem' k, unnest(paises_origem) v FROM permitidas
    UNION ALL SELECT 'portosOrigem', unnest(portos_origem) FROM permitidas
    UNION ALL SELECT 'paisesDestino', unnest(paises_destino) FROM permitidas
    UNION ALL SELECT 'portosDestino', unnest(portos_destino) FROM permitidas
    UNION ALL SELECT 'rotas', unnest(rotas) FROM permitidas
  ),
  unicos AS (
    SELECT DISTINCT ON (k, upper(v)) k, v FROM vals
    WHERE v IS NOT NULL
    ORDER BY k, upper(v), (v = upper(v)), v
  )
  SELECT jsonb_build_object(
    'paisesOrigem', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM unicos WHERE k='paisesOrigem'), '[]'::jsonb),
    'portosOrigem', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM unicos WHERE k='portosOrigem'), '[]'::jsonb),
    'paisesDestino', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM unicos WHERE k='paisesDestino'), '[]'::jsonb),
    'portosDestino', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM unicos WHERE k='portosDestino'), '[]'::jsonb),
    'rotas', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM unicos WHERE k='rotas'), '[]'::jsonb)
  );
$function$;