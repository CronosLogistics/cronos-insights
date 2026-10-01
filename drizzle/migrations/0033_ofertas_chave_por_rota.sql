ALTER TABLE public.ofertas DROP CONSTRAINT IF EXISTS ofertas_oferta_revisao_key;
ALTER TABLE public.ofertas ADD CONSTRAINT ofertas_oferta_revisao_rota_key UNIQUE NULLS NOT DISTINCT (oferta, revisao, rota);
CREATE INDEX IF NOT EXISTS ofertas_oferta_revisao_idx ON public.ofertas (oferta, revisao);