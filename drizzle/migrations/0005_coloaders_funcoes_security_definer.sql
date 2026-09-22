CREATE OR REPLACE FUNCTION public.coloaders_opcoes_filtro()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'analitico'
AS $function$
  SELECT jsonb_build_object(
    'coloaders',
    COALESCE((SELECT jsonb_agg(DISTINCT m.coloader ORDER BY m.coloader)
              FROM analitico.mv_coloader_ind m
              WHERE m.produto = ANY (public.produtos_do_usuario()) AND m.coloader <> 'Todos'), '[]'::jsonb)
  );
$function$;

CREATE OR REPLACE FUNCTION public.coloaders_analise(p_coloader text DEFAULT 'Todos'::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'analitico'
AS $function$
WITH prod AS (SELECT public.produtos_do_usuario() AS prods),
cli AS (SELECT m.item, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
        FROM analitico.mv_coloader_cliente m, prod
        WHERE m.produto = ANY (prod.prods) AND m.coloader = p_coloader GROUP BY m.item),
rot AS (SELECT m.item, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
        FROM analitico.mv_coloader_rota m, prod
        WHERE m.produto = ANY (prod.prods) AND m.coloader = p_coloader GROUP BY m.item),
age AS (SELECT m.item, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
        FROM analitico.mv_coloader_agente m, prod
        WHERE m.produto = ANY (prod.prods) AND m.coloader = p_coloader GROUP BY m.item),
mot AS (SELECT m.motivo, sum(m.reprovadas)::bigint reprovadas
        FROM analitico.mv_coloader_motivo m, prod
        WHERE m.produto = ANY (prod.prods) AND m.coloader = p_coloader GROUP BY m.motivo),
rc AS (SELECT m.rota, m.cliente, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
       FROM analitico.mv_coloader_rota_cliente m, prod
       WHERE m.produto = ANY (prod.prods) AND m.coloader = p_coloader GROUP BY m.rota, m.cliente),
ind AS (SELECT sum(m.rotas)::bigint rotas, sum(m.ofertas)::bigint ofertas, sum(m.coloaders)::bigint coloaders,
               sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
        FROM analitico.mv_coloader_ind m, prod
        WHERE m.produto = ANY (prod.prods) AND m.coloader = p_coloader),
media AS (SELECT sum(m.aprovadas)::bigint ap, sum(m.reprovadas)::bigint rp
          FROM analitico.mv_coloader_ind m, prod
          WHERE m.produto = ANY (prod.prods) AND m.coloader = 'Todos')
SELECT jsonb_build_object(
  'indicadores', jsonb_build_object(
    'rotas', COALESCE((SELECT rotas FROM ind), 0),
    'ofertas', COALESCE((SELECT ofertas FROM ind), 0),
    'clientes', (SELECT count(*) FROM cli),
    'rotas_distintas', (SELECT count(*) FROM rot),
    'coloaders', COALESCE((SELECT coloaders FROM ind), 0),
    'aprovadas', COALESCE((SELECT aprovadas FROM ind), 0),
    'reprovadas', COALESCE((SELECT reprovadas FROM ind), 0),
    'em_analise', COALESCE((SELECT em_analise FROM ind), 0)),
  'mediaAprovadas', COALESCE((SELECT ap FROM media), 0),
  'mediaReprovadas', COALESCE((SELECT rp FROM media), 0),
  'clientes', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM cli ORDER BY rotas DESC, item LIMIT 10) x), '[]'::jsonb),
  'rotas', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM rot ORDER BY rotas DESC, item LIMIT 10) x), '[]'::jsonb),
  'agentes', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM age ORDER BY rotas DESC, item LIMIT 10) x), '[]'::jsonb),
  'motivosTotal', COALESCE((SELECT sum(reprovadas) FROM mot), 0),
  'motivos', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM mot ORDER BY reprovadas DESC, motivo LIMIT 10) x), '[]'::jsonb),
  'rotaCliente', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM rc ORDER BY reprovadas DESC, rotas DESC, rota, cliente LIMIT 10) x), '[]'::jsonb)
);
$function$;