CREATE OR REPLACE FUNCTION public.ofertas_por_mes(
  p_coloader text DEFAULT 'Todos', p_agente text DEFAULT 'Todos', p_analista text DEFAULT 'Todos',
  p_motivo text DEFAULT 'Todos', p_rota text DEFAULT 'Todos',
  p_pais_origem text DEFAULT 'Todos', p_porto_origem text DEFAULT 'Todos',
  p_pais_destino text DEFAULT 'Todos', p_porto_destino text DEFAULT 'Todos',
  p_anos integer[] DEFAULT NULL, p_meses integer[] DEFAULT NULL,
  p_modalidade text DEFAULT 'Todos', p_somente_reprovadas boolean DEFAULT false)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
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
      and (coalesce(p_rota,'Todos') = 'Todos' or rota_analitica = p_rota)
      and (coalesce(p_pais_origem,'Todos') = 'Todos' or pais_origem_f = p_pais_origem)
      and (coalesce(p_porto_origem,'Todos') = 'Todos' or porto_origem = p_porto_origem)
      and (coalesce(p_pais_destino,'Todos') = 'Todos' or pais_destino_f = p_pais_destino)
      and (coalesce(p_porto_destino,'Todos') = 'Todos' or porto_destino = p_porto_destino)
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
$function$;

GRANT EXECUTE ON FUNCTION public.ofertas_por_mes(text,text,text,text,text,text,text,text,text,integer[],integer[],text,boolean) TO authenticated;