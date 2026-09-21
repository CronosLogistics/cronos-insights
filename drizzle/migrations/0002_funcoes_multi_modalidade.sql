-- Funções sobre base de grão bruto: troca direta do filtro de produto
DO $do$
DECLARE r record; d text;
BEGIN
  FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname IN ('dashboard_analise_filtrada', 'dashboard_opcoes_filtro')
  LOOP
    d := pg_get_functiondef(r.oid);
    d := replace(d, '= public.produto_do_usuario()', '= ANY (public.produtos_do_usuario())');
    EXECUTE d;
  END LOOP;
END $do$;

-- Caminho rápido do dashboard vale apenas quando o usuário tem uma única modalidade
CREATE OR REPLACE FUNCTION public.dashboard_analise(
  p_data_inicial date DEFAULT NULL, p_data_final date DEFAULT NULL,
  p_analista text DEFAULT 'Todos', p_vendedor text DEFAULT 'Todos', p_cliente text DEFAULT 'Todos',
  p_origem text DEFAULT 'Todos', p_destino text DEFAULT 'Todos', p_rota text DEFAULT 'Todos',
  p_coloader text DEFAULT 'Todos', p_resultado text DEFAULT 'Todos', p_motivo text DEFAULT 'Todos',
  p_min_decisoes integer DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'analitico'
AS $function$
DECLARE
  v_prods text[];
  v_resumo analitico.mv_dashboard_resumo%ROWTYPE;
BEGIN
  v_prods := public.produtos_do_usuario();

  IF array_length(v_prods, 1) = 1
     AND coalesce(p_analista, 'Todos') = 'Todos'
     AND coalesce(p_vendedor, 'Todos') = 'Todos'
     AND coalesce(p_cliente, 'Todos') = 'Todos'
     AND coalesce(p_origem, 'Todos') = 'Todos'
     AND coalesce(p_destino, 'Todos') = 'Todos'
     AND coalesce(p_rota, 'Todos') = 'Todos'
     AND coalesce(p_coloader, 'Todos') = 'Todos'
     AND coalesce(p_resultado, 'Todos') = 'Todos'
     AND coalesce(p_motivo, 'Todos') = 'Todos' THEN
    SELECT * INTO v_resumo FROM analitico.mv_dashboard_resumo WHERE produto = v_prods[1];
    IF FOUND
       AND (p_data_inicial IS NULL OR p_data_inicial <= v_resumo.data_inicial)
       AND (p_data_final IS NULL OR p_data_final >= v_resumo.data_final) THEN
      RETURN v_resumo.payload;
    END IF;
  END IF;

  RETURN public.dashboard_analise_filtrada(
    p_data_inicial, p_data_final, p_analista, p_vendedor, p_cliente,
    p_origem, p_destino, p_rota, p_coloader, p_resultado, p_motivo, p_min_decisoes);
END;
$function$;

CREATE OR REPLACE FUNCTION public.analistas_opcoes_filtro()
RETURNS jsonb
LANGUAGE sql STABLE SET search_path TO 'public', 'analitico'
AS $function$
  SELECT jsonb_build_object('analistas', COALESCE((
    SELECT jsonb_agg(analista ORDER BY analista) FROM (
      SELECT DISTINCT m.analista FROM analitico.mv_analista_ind m
      WHERE m.produto = ANY (public.produtos_do_usuario()) AND m.analista <> 'Todos'
    ) s
  ), '[]'::jsonb));
$function$;

CREATE OR REPLACE FUNCTION public.motivos_perda_opcoes_filtro()
RETURNS jsonb
LANGUAGE sql STABLE SET search_path TO 'public', 'analitico'
AS $function$
  SELECT jsonb_build_object('motivos', COALESCE((
    SELECT jsonb_agg(motivo ORDER BY motivo) FROM (
      SELECT DISTINCT m.motivo FROM analitico.mv_motivo_ind m
      WHERE m.produto = ANY (public.produtos_do_usuario()) AND m.motivo <> 'Todos'
    ) s
  ), '[]'::jsonb));
$function$;

CREATE OR REPLACE FUNCTION public.analistas_analise(p_analista text DEFAULT 'Todos')
RETURNS jsonb
LANGUAGE sql STABLE SET search_path TO 'public', 'analitico'
AS $function$
WITH prod AS (SELECT public.produtos_do_usuario() AS prods),
cli AS (SELECT m.item, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
        FROM analitico.mv_analista_cliente m, prod
        WHERE m.produto = ANY (prod.prods) AND m.analista = p_analista GROUP BY m.item),
rot AS (SELECT m.item, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
        FROM analitico.mv_analista_rota m, prod
        WHERE m.produto = ANY (prod.prods) AND m.analista = p_analista GROUP BY m.item),
col AS (SELECT m.item, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
        FROM analitico.mv_analista_coloader m, prod
        WHERE m.produto = ANY (prod.prods) AND m.analista = p_analista GROUP BY m.item),
age AS (SELECT m.item, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
        FROM analitico.mv_analista_agente m, prod
        WHERE m.produto = ANY (prod.prods) AND m.analista = p_analista GROUP BY m.item),
mot AS (SELECT m.motivo, sum(m.reprovadas)::bigint reprovadas
        FROM analitico.mv_analista_motivo m, prod
        WHERE m.produto = ANY (prod.prods) AND m.analista = p_analista GROUP BY m.motivo),
ra AS (SELECT m.rota, m.agente, sum(m.rotas)::bigint rotas, sum(m.aprovadas)::bigint aprovadas, sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
       FROM analitico.mv_analista_rota_agente m, prod
       WHERE m.produto = ANY (prod.prods) AND m.analista = p_analista GROUP BY m.rota, m.agente),
ind AS (SELECT sum(m.rotas)::bigint rotas, sum(m.ofertas)::bigint ofertas, sum(m.aprovadas)::bigint aprovadas,
               sum(m.reprovadas)::bigint reprovadas, sum(m.em_analise)::bigint em_analise
        FROM analitico.mv_analista_ind m, prod
        WHERE m.produto = ANY (prod.prods) AND m.analista = p_analista),
media AS (SELECT sum(m.aprovadas)::bigint ap, sum(m.reprovadas)::bigint rp
          FROM analitico.mv_analista_ind m, prod
          WHERE m.produto = ANY (prod.prods) AND m.analista = 'Todos')
SELECT jsonb_build_object(
  'indicadores', jsonb_build_object(
    'rotas', COALESCE((SELECT rotas FROM ind), 0),
    'ofertas', COALESCE((SELECT ofertas FROM ind), 0),
    'clientes', (SELECT count(*) FROM cli),
    'rotas_distintas', (SELECT count(*) FROM rot),
    'coloaders', (SELECT count(*) FROM col),
    'aprovadas', COALESCE((SELECT aprovadas FROM ind), 0),
    'reprovadas', COALESCE((SELECT reprovadas FROM ind), 0),
    'em_analise', COALESCE((SELECT em_analise FROM ind), 0)),
  'mediaAprovadas', COALESCE((SELECT ap FROM media), 0),
  'mediaReprovadas', COALESCE((SELECT rp FROM media), 0),
  'clientes', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM cli ORDER BY rotas DESC, item LIMIT 10) x), '[]'::jsonb),
  'rotas', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM rot ORDER BY rotas DESC, item LIMIT 10) x), '[]'::jsonb),
  'coloaders', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM col ORDER BY rotas DESC, item LIMIT 10) x), '[]'::jsonb),
  'agentes', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM age ORDER BY rotas DESC, item LIMIT 10) x), '[]'::jsonb),
  'motivosTotal', COALESCE((SELECT sum(reprovadas) FROM mot), 0),
  'motivos', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM mot ORDER BY reprovadas DESC, motivo LIMIT 10) x), '[]'::jsonb),
  'rotaAgente', COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM ra ORDER BY reprovadas DESC, rotas DESC, rota, agente LIMIT 10) x), '[]'::jsonb)
);
$function$;

CREATE OR REPLACE FUNCTION public.motivos_perda_analise(p_motivo text DEFAULT 'Todos')
RETURNS jsonb
LANGUAGE sql STABLE SET search_path TO 'public', 'analitico'
AS $function$
WITH prod AS (SELECT public.produtos_do_usuario() AS prods),
tot AS (SELECT sum(m.reprovacoes)::bigint reprovacoes FROM analitico.mv_motivo_ind m, prod
        WHERE m.produto = ANY (prod.prods) AND m.motivo = 'Todos'),
ind AS (SELECT sum(m.reprovacoes)::bigint reprovacoes FROM analitico.mv_motivo_ind m, prod
        WHERE m.produto = ANY (prod.prods) AND m.motivo = p_motivo),
rot AS (SELECT m.item, sum(m.reprovacoes)::bigint reprovacoes FROM analitico.mv_motivo_rota m, prod
        WHERE m.produto = ANY (prod.prods) AND m.motivo = p_motivo GROUP BY m.item),
cli AS (SELECT m.item, sum(m.reprovacoes)::bigint reprovacoes FROM analitico.mv_motivo_cliente m, prod
        WHERE m.produto = ANY (prod.prods) AND m.motivo = p_motivo GROUP BY m.item),
col AS (SELECT m.item, sum(m.reprovacoes)::bigint reprovacoes FROM analitico.mv_motivo_coloader m, prod
        WHERE m.produto = ANY (prod.prods) AND m.motivo = p_motivo GROUP BY m.item),
age AS (SELECT m.item, sum(m.reprovacoes)::bigint reprovacoes FROM analitico.mv_motivo_agente m, prod
        WHERE m.produto = ANY (prod.prods) AND m.motivo = p_motivo GROUP BY m.item),
rc AS (SELECT m.rota, m.cliente, sum(m.reprovacoes)::bigint reprovacoes FROM analitico.mv_motivo_rota_cliente m, prod
       WHERE m.produto = ANY (prod.prods) AND m.motivo = p_motivo GROUP BY m.rota, m.cliente),
mes AS (SELECT m.mes, sum(m.reprovacoes)::bigint reprovacoes FROM analitico.mv_motivo_mes m, prod
        WHERE m.produto = ANY (prod.prods) AND m.motivo = p_motivo GROUP BY m.mes),
mes_tot AS (SELECT m.mes, sum(m.reprovacoes)::bigint reprovacoes FROM analitico.mv_motivo_mes m, prod
            WHERE m.produto = ANY (prod.prods) AND m.motivo = 'Todos' GROUP BY m.mes),
base AS (SELECT COALESCE((SELECT reprovacoes FROM ind), 0) AS r)
SELECT jsonb_build_object(
  'indicadores', jsonb_build_object(
    'reprovacoes', (SELECT r FROM base),
    'pct_reprovacoes', CASE WHEN COALESCE((SELECT reprovacoes FROM tot), 0) > 0
      THEN (SELECT r FROM base)::numeric / (SELECT reprovacoes FROM tot) ELSE 0 END,
    'rotas', (SELECT count(*) FROM rot),
    'clientes', (SELECT count(*) FROM cli),
    'coloaders', (SELECT count(*) FROM col),
    'agentes', (SELECT count(*) FROM age),
    'meses', (SELECT count(*) FROM mes),
    'amostra', (SELECT r FROM base)),
  'perfil', jsonb_build_object(
    'principal_rota', (SELECT item FROM rot ORDER BY reprovacoes DESC, item LIMIT 1),
    'principal_cliente', (SELECT item FROM cli ORDER BY reprovacoes DESC, item LIMIT 1),
    'principal_coloader', (SELECT item FROM col ORDER BY reprovacoes DESC, item LIMIT 1),
    'principal_agente', (SELECT item FROM age ORDER BY reprovacoes DESC, item LIMIT 1)),
  'motivo_rota', COALESCE((SELECT jsonb_agg(x) FROM (
    SELECT item, reprovacoes, CASE WHEN (SELECT r FROM base) > 0 THEN reprovacoes::numeric / (SELECT r FROM base) ELSE 0 END pct_motivo
    FROM rot ORDER BY reprovacoes DESC, item LIMIT 10) x), '[]'::jsonb),
  'motivo_cliente', COALESCE((SELECT jsonb_agg(x) FROM (
    SELECT item, reprovacoes, CASE WHEN (SELECT r FROM base) > 0 THEN reprovacoes::numeric / (SELECT r FROM base) ELSE 0 END pct_motivo
    FROM cli ORDER BY reprovacoes DESC, item LIMIT 10) x), '[]'::jsonb),
  'coloaders', COALESCE((SELECT jsonb_agg(x) FROM (
    SELECT item, reprovacoes, CASE WHEN (SELECT r FROM base) > 0 THEN reprovacoes::numeric / (SELECT r FROM base) ELSE 0 END pct_motivo
    FROM col ORDER BY reprovacoes DESC, item LIMIT 10) x), '[]'::jsonb),
  'agentes', COALESCE((SELECT jsonb_agg(x) FROM (
    SELECT item, reprovacoes, CASE WHEN (SELECT r FROM base) > 0 THEN reprovacoes::numeric / (SELECT r FROM base) ELSE 0 END pct_motivo
    FROM age ORDER BY reprovacoes DESC, item LIMIT 10) x), '[]'::jsonb),
  'rota_cliente', COALESCE((SELECT jsonb_agg(x) FROM (
    SELECT rota, cliente, reprovacoes FROM rc ORDER BY reprovacoes DESC, rota, cliente LIMIT 10) x), '[]'::jsonb),
  'evolucao_mensal', COALESCE((SELECT jsonb_agg(x ORDER BY x.mes) FROM (
    SELECT m.mes::text AS mes, m.reprovacoes,
      CASE WHEN COALESCE(t.reprovacoes, 0) > 0 THEN m.reprovacoes::numeric / t.reprovacoes ELSE 0 END pct_mes
    FROM mes m LEFT JOIN mes_tot t ON t.mes = m.mes) x), '[]'::jsonb)
);
$function$;

CREATE OR REPLACE FUNCTION public.qualidade_dados_analise()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'analitico'
AS $function$
WITH q AS (
  SELECT sum(linhas_base) linhas_base, sum(sem_cliente) sem_cliente,
    sum(sem_origem_destino) sem_origem_destino, sum(sem_armador) sem_armador,
    sum(sem_agente) sem_agente, sum(sem_analise) sem_analise,
    sum(reprovadas_sem_motivo) reprovadas_sem_motivo, sum(sem_data_abertura) sem_data_abertura,
    sum(conclusao_anterior) conclusao_anterior, sum(registros_duplicados) registros_duplicados,
    sum(cliente_preenchido) cliente_preenchido, sum(origem_preenchida) origem_preenchida,
    sum(destino_preenchido) destino_preenchido, sum(armador_preenchido) armador_preenchido,
    sum(agente_preenchido) agente_preenchido, sum(vendedor_preenchido) vendedor_preenchido,
    sum(pricing_preenchido) pricing_preenchido, sum(analise_preenchida) analise_preenchida,
    sum(motivo_preenchido) motivo_preenchido, sum(modalidade_preenchida) modalidade_preenchida,
    sum(incoterm_preenchido) incoterm_preenchido, sum(data_abertura_preenchida) data_abertura_preenchida
  FROM analitico.mv_qualidade_resumo
  WHERE produto = ANY (public.produtos_do_usuario())
)
SELECT jsonb_build_object(
  'linhas_base', coalesce((SELECT linhas_base FROM q), 0),
  'indicadores', coalesce((
    SELECT jsonb_agg(x ORDER BY ord) FROM (
      SELECT 1 AS ord, jsonb_build_object('indicador', 'Registros duplicados (oferta + revisão)', 'quantidade', registros_duplicados, 'impacto', 'Pode inflar contagens e distorcer conversão') AS x FROM q
      UNION ALL SELECT 2, jsonb_build_object('indicador', 'Sem cliente informado', 'quantidade', sem_cliente, 'impacto', 'Análises por cliente ficam incompletas') FROM q
      UNION ALL SELECT 3, jsonb_build_object('indicador', 'Sem origem ou destino', 'quantidade', sem_origem_destino, 'impacto', 'Rota analítica fica como Não informado') FROM q
      UNION ALL SELECT 4, jsonb_build_object('indicador', 'Sem coloader/armador', 'quantidade', sem_armador, 'impacto', 'Rankings de coloader perdem representatividade') FROM q
      UNION ALL SELECT 5, jsonb_build_object('indicador', 'Sem agente', 'quantidade', sem_agente, 'impacto', 'Rankings de agente perdem representatividade') FROM q
      UNION ALL SELECT 6, jsonb_build_object('indicador', 'Sem status de análise', 'quantidade', sem_analise, 'impacto', 'Não entra em aprovadas, reprovadas ou em análise') FROM q
      UNION ALL SELECT 7, jsonb_build_object('indicador', 'Reprovadas sem motivo', 'quantidade', reprovadas_sem_motivo, 'impacto', 'Impede identificar o principal motivo de perda') FROM q
      UNION ALL SELECT 8, jsonb_build_object('indicador', 'Sem data de abertura', 'quantidade', sem_data_abertura, 'impacto', 'Séries temporais e tempo de resposta ficam incompletos') FROM q
      UNION ALL SELECT 9, jsonb_build_object('indicador', 'Conclusão anterior à abertura', 'quantidade', conclusao_anterior, 'impacto', 'Indica inconsistência de datas na origem') FROM q
    ) i
  ), '[]'::jsonb),
  'campos', coalesce((
    SELECT jsonb_agg(x ORDER BY ord) FROM (
      SELECT 1 AS ord, jsonb_build_object('campo', 'Cliente', 'preenchidos', cliente_preenchido) AS x FROM q
      UNION ALL SELECT 2, jsonb_build_object('campo', 'Origem', 'preenchidos', origem_preenchida) FROM q
      UNION ALL SELECT 3, jsonb_build_object('campo', 'Destino', 'preenchidos', destino_preenchido) FROM q
      UNION ALL SELECT 4, jsonb_build_object('campo', 'Armador / Coloader', 'preenchidos', armador_preenchido) FROM q
      UNION ALL SELECT 5, jsonb_build_object('campo', 'Agente', 'preenchidos', agente_preenchido) FROM q
      UNION ALL SELECT 6, jsonb_build_object('campo', 'Vendedor', 'preenchidos', vendedor_preenchido) FROM q
      UNION ALL SELECT 7, jsonb_build_object('campo', 'Analista de Pricing', 'preenchidos', pricing_preenchido) FROM q
      UNION ALL SELECT 8, jsonb_build_object('campo', 'Análise', 'preenchidos', analise_preenchida) FROM q
      UNION ALL SELECT 9, jsonb_build_object('campo', 'Motivo', 'preenchidos', motivo_preenchido) FROM q
      UNION ALL SELECT 10, jsonb_build_object('campo', 'Modalidade', 'preenchidos', modalidade_preenchida) FROM q
      UNION ALL SELECT 11, jsonb_build_object('campo', 'Incoterm', 'preenchidos', incoterm_preenchido) FROM q
      UNION ALL SELECT 12, jsonb_build_object('campo', 'Data de abertura', 'preenchidos', data_abertura_preenchida) FROM q
    ) c
  ), '[]'::jsonb)
);
$function$;