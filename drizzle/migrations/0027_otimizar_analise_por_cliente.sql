CREATE INDEX IF NOT EXISTS idx_ofertas_produto_cliente_analitico_id
ON public.ofertas (
  produto,
  (COALESCE(NULLIF(btrim(cliente), ''), '(Não informado)')),
  id
);

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
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
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
  WHERE o.produto = ANY (public.produtos_do_usuario())
    AND COALESCE(NULLIF(btrim(o.cliente), ''), '(Não informado)') = p_cliente
    AND (COALESCE(cardinality(p_anos), 0) = 0 OR o.ano = ANY (p_anos))
    AND (COALESCE(cardinality(p_meses), 0) = 0 OR o.mes = ANY (p_meses))
    AND (
      COALESCE(p_modalidade, 'Todos') = 'Todos'
      OR COALESCE(NULLIF(btrim(o.modalidade), ''), 'Não informado') = p_modalidade
    )
  ORDER BY o.id
  LIMIT LEAST(GREATEST(COALESCE(p_limite, 1000), 1), 1000)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0)
$$;

REVOKE ALL ON FUNCTION public.cliente_ofertas_analise(text, integer[], integer[], text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cliente_ofertas_analise(text, integer[], integer[], text, integer, integer) TO authenticated, service_role;

ANALYZE public.ofertas;
NOTIFY pgrst, 'reload schema';