CREATE OR REPLACE FUNCTION public.cliente_todos_analise(
  p_anos integer[] DEFAULT NULL,
  p_meses integer[] DEFAULT NULL,
  p_modalidade text DEFAULT 'Todos',
  p_limite integer DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET plan_cache_mode = force_custom_plan
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_produtos text[];
  v_lim integer := LEAST(GREATEST(COALESCE(p_limite, 500), 1), 2000);
  v_res jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT CASE
    WHEN COALESCE((SELECT p.ativo FROM public.perfis p WHERE p.id = v_user_id), false)
    THEN COALESCE((SELECT array_agg(pp.produto_codigo) FROM public.perfis_produtos pp WHERE pp.user_id = v_user_id), ARRAY[]::text[])
    ELSE ARRAY[]::text[]
  END INTO v_produtos;

  WITH base AS MATERIALIZED (
    SELECT
      NULLIF(btrim(o.oferta), '') AS oferta,
      COALESCE(NULLIF(btrim(o.cliente), ''), '(Não informado)') AS cliente,
      CASE WHEN NULLIF(btrim(o.origem), '') IS NOT NULL AND NULLIF(btrim(o.destino), '') IS NOT NULL
        THEN btrim(o.origem) || ' → ' || btrim(o.destino) ELSE '(Rota incompleta)' END AS rota,
      COALESCE(NULLIF(btrim(o.armador), ''), '(Não informado)') AS coloader,
      regexp_replace(COALESCE(NULLIF(btrim(o.agente), ''), '(Não informado)'), '\s+', ' ', 'g') AS agente,
      COALESCE(NULLIF(btrim(o.motivo), ''), '(Não informado)') AS motivo,
      (o.analise = 'Aprovado')::int AS ap,
      (o.analise = 'Reprovado')::int AS rp,
      (o.analise = 'Em Aberto')::int AS ea
    FROM public.ofertas o
    WHERE o.produto = ANY (v_produtos)
      AND (COALESCE(cardinality(p_anos), 0) = 0 OR o.ano = ANY (p_anos))
      AND (COALESCE(cardinality(p_meses), 0) = 0 OR o.mes = ANY (p_meses))
      AND (COALESCE(p_modalidade, 'Todos') = 'Todos'
        OR COALESCE(NULLIF(btrim(o.modalidade), ''), 'Não informado') = p_modalidade)
  ),
  g AS (
    SELECT rota, coloader, agente, motivo,
      GROUPING(rota) AS gr, GROUPING(coloader) AS gc, GROUPING(agente) AS ga, GROUPING(motivo) AS gm,
      count(*)::int AS n, sum(ap)::int AS ap, sum(rp)::int AS rp, sum(ea)::int AS ea
    FROM base
    GROUP BY GROUPING SETS ((rota), (coloader), (agente), (motivo), (rota, coloader))
  )
  SELECT jsonb_build_object(
    'totais', (SELECT jsonb_build_object(
        'rotas', count(*), 'ofertas', count(DISTINCT oferta),
        'aprovadas', COALESCE(sum(ap),0), 'reprovadas', COALESCE(sum(rp),0), 'emAnalise', COALESCE(sum(ea),0),
        'clientes', count(DISTINCT cliente), 'rotasDistintas', count(DISTINCT rota), 'coloaders', count(DISTINCT coloader))
      FROM base),
    'rotas', COALESCE((SELECT jsonb_agg(x) FROM (SELECT rota AS item, n, ap, rp, ea FROM g WHERE gr=0 AND gc=1 ORDER BY n DESC, rota LIMIT v_lim) x), '[]'),
    'coloaders', COALESCE((SELECT jsonb_agg(x) FROM (SELECT coloader AS item, n, ap, rp, ea FROM g WHERE gc=0 AND gr=1 ORDER BY n DESC, coloader LIMIT v_lim) x), '[]'),
    'agentes', COALESCE((SELECT jsonb_agg(x) FROM (SELECT agente AS item, n, ap, rp, ea FROM g WHERE ga=0 ORDER BY n DESC, agente LIMIT v_lim) x), '[]'),
    'motivos', COALESCE((SELECT jsonb_agg(x) FROM (SELECT motivo AS item, rp FROM g WHERE gm=0 AND rp > 0 ORDER BY rp DESC, motivo) x), '[]'),
    'rotaColoader', COALESCE((SELECT jsonb_agg(x) FROM (SELECT rota, coloader, n, ap, rp, ea FROM g WHERE gr=0 AND gc=0 ORDER BY rp DESC, n DESC, rota, coloader LIMIT v_lim) x), '[]')
  ) INTO v_res;

  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.cliente_todos_analise(integer[], integer[], text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cliente_todos_analise(integer[], integer[], text, integer) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';