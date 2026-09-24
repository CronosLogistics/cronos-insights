CREATE OR REPLACE FUNCTION public.cliente_ofertas_analise(
  p_cliente text,
  p_anos integer[] DEFAULT NULL,
  p_meses integer[] DEFAULT NULL,
  p_modalidade text DEFAULT 'Todos',
  p_limite integer DEFAULT 1000,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id bigint,
  oferta text,
  cliente text,
  origem text,
  destino text,
  armador text,
  agente text,
  motivo text,
  analise text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET plan_cache_mode = force_custom_plan
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_produtos text[];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT CASE
    WHEN COALESCE((SELECT p.ativo FROM public.perfis p WHERE p.id = v_user_id), false)
    THEN COALESCE((
      SELECT array_agg(pp.produto_codigo ORDER BY pp.produto_codigo)
      FROM public.perfis_produtos pp
      WHERE pp.user_id = v_user_id
    ), ARRAY[]::text[])
    ELSE ARRAY[]::text[]
  END INTO v_produtos;

  IF COALESCE(cardinality(v_produtos), 0) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.oferta,
    o.cliente,
    o.origem,
    o.destino,
    o.armador,
    o.agente,
    o.motivo,
    o.analise
  FROM public.ofertas o
  WHERE o.produto = ANY (v_produtos)
    AND COALESCE(NULLIF(btrim(o.cliente), ''), '(Não informado)') = p_cliente
    AND (COALESCE(cardinality(p_anos), 0) = 0 OR o.ano = ANY (p_anos))
    AND (COALESCE(cardinality(p_meses), 0) = 0 OR o.mes = ANY (p_meses))
    AND (
      COALESCE(p_modalidade, 'Todos') = 'Todos'
      OR COALESCE(NULLIF(btrim(o.modalidade), ''), 'Não informado') = p_modalidade
    )
  ORDER BY o.id
  LIMIT LEAST(GREATEST(COALESCE(p_limite, 1000), 1), 1000)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.cliente_ofertas_analise(text, integer[], integer[], text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cliente_ofertas_analise(text, integer[], integer[], text, integer, integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';