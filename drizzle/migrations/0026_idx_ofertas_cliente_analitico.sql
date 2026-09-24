CREATE INDEX IF NOT EXISTS idx_ofertas_cliente_analitico ON public.ofertas ((COALESCE(NULLIF(btrim(cliente), ''::text), '(Não informado)'::text)), produto);
ANALYZE public.ofertas;