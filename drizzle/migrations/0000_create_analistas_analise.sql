CREATE OR REPLACE VIEW public.v_ofertas_analitico
WITH (security_invoker = true) AS
SELECT id,
    oferta,
    COALESCE(NULLIF(btrim(cliente), ''), '(Não informado)') AS cliente_analitico,
    (COALESCE(NULLIF(btrim(origem), ''), 'Não informado') || ' → ') || COALESCE(NULLIF(btrim(destino), ''), 'Não informado') AS rota_analitica,
    COALESCE(NULLIF(btrim(armador), ''), '(Não informado)') AS coloader_analitico,
    COALESCE(NULLIF(btrim(agente), ''), '(Não informado)') AS agente_analitico,
    COALESCE(NULLIF(btrim(motivo), ''), '(Não informado)') AS motivo_perda_analitico,
    (analise = 'Aprovado')::integer AS flag_aprovada,
    (analise = 'Reprovado')::integer AS flag_reprovada,
    (analise = 'Em Aberto')::integer AS flag_em_analise,
    COALESCE(NULLIF(btrim(pais_origem), ''), '(Não informado)') AS pais_origem,
    COALESCE(NULLIF(btrim(origem), ''), '(Não informado)') AS porto_origem,
    COALESCE(NULLIF(btrim(pais_destino), ''), '(Não informado)') AS pais_destino,
    COALESCE(NULLIF(btrim(destino), ''), '(Não informado)') AS porto_destino,
    COALESCE(NULLIF(btrim(pricing), ''), '(Não informado)') AS analista_pricing
FROM public.ofertas o
WHERE produto IS NOT NULL;

CREATE INDEX IF NOT EXISTS ofertas_produto_pricing_idx ON public.ofertas (produto, pricing);

CREATE OR REPLACE FUNCTION public.analistas_opcoes_filtro()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'analistas',
    COALESCE((
      SELECT jsonb_agg(a ORDER BY a)
      FROM (SELECT DISTINCT analista_pricing AS a FROM public.v_ofertas_analitico) s
    ), '[]'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION public.analistas_analise(p_analista text DEFAULT 'Todos')
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
WITH base AS (
  SELECT *
  FROM public.v_ofertas_analitico
  WHERE p_analista = 'Todos' OR analista_pricing = p_analista
),
ind AS (
  SELECT jsonb_build_object(
    'rotas', count(*),
    'ofertas', count(DISTINCT oferta),
    'clientes', count(DISTINCT cliente_analitico),
    'rotas_distintas', count(DISTINCT rota_analitica),
    'coloaders', count(DISTINCT coloader_analitico),
    'aprovadas', COALESCE(sum(flag_aprovada), 0),
    'reprovadas', COALESCE(sum(flag_reprovada), 0),
    'em_analise', COALESCE(sum(flag_em_analise), 0)
  ) AS j FROM base
),
media AS (
  SELECT COALESCE(sum(flag_aprovada), 0) AS ap, COALESCE(sum(flag_reprovada), 0) AS rp
  FROM public.v_ofertas_analitico
),
rk_cli AS (
  SELECT jsonb_agg(x) AS j FROM (
    SELECT cliente_analitico AS item, count(*) AS rotas, sum(flag_aprovada) AS aprovadas,
           sum(flag_reprovada) AS reprovadas, sum(flag_em_analise) AS em_analise
    FROM base GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10
  ) x
),
rk_rot AS (
  SELECT jsonb_agg(x) AS j FROM (
    SELECT rota_analitica AS item, count(*) AS rotas, sum(flag_aprovada) AS aprovadas,
           sum(flag_reprovada) AS reprovadas, sum(flag_em_analise) AS em_analise
    FROM base GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10
  ) x
),
rk_col AS (
  SELECT jsonb_agg(x) AS j FROM (
    SELECT coloader_analitico AS item, count(*) AS rotas, sum(flag_aprovada) AS aprovadas,
           sum(flag_reprovada) AS reprovadas, sum(flag_em_analise) AS em_analise
    FROM base GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10
  ) x
),
rk_age AS (
  SELECT jsonb_agg(x) AS j FROM (
    SELECT agente_analitico AS item, count(*) AS rotas, sum(flag_aprovada) AS aprovadas,
           sum(flag_reprovada) AS reprovadas, sum(flag_em_analise) AS em_analise
    FROM base GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10
  ) x
),
mot AS (
  SELECT count(*) AS total FROM base WHERE flag_reprovada = 1
),
rk_mot AS (
  SELECT jsonb_agg(x) AS j FROM (
    SELECT motivo_perda_analitico AS motivo, count(*) AS reprovadas
    FROM base WHERE flag_reprovada = 1 GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10
  ) x
),
rk_ra AS (
  SELECT jsonb_agg(x) AS j FROM (
    SELECT rota_analitica AS rota, agente_analitico AS agente, count(*) AS rotas,
           sum(flag_aprovada) AS aprovadas, sum(flag_reprovada) AS reprovadas,
           sum(flag_em_analise) AS em_analise
    FROM base GROUP BY 1, 2
    ORDER BY sum(flag_reprovada) DESC, count(*) DESC, 1, 2 LIMIT 10
  ) x
)
SELECT jsonb_build_object(
  'indicadores', (SELECT j FROM ind),
  'mediaAprovadas', (SELECT ap FROM media),
  'mediaReprovadas', (SELECT rp FROM media),
  'clientes', COALESCE((SELECT j FROM rk_cli), '[]'::jsonb),
  'rotas', COALESCE((SELECT j FROM rk_rot), '[]'::jsonb),
  'coloaders', COALESCE((SELECT j FROM rk_col), '[]'::jsonb),
  'agentes', COALESCE((SELECT j FROM rk_age), '[]'::jsonb),
  'motivosTotal', (SELECT total FROM mot),
  'motivos', COALESCE((SELECT j FROM rk_mot), '[]'::jsonb),
  'rotaAgente', COALESCE((SELECT j FROM rk_ra), '[]'::jsonb)
);
$$;

REVOKE ALL ON FUNCTION public.analistas_opcoes_filtro() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.analistas_analise(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analistas_opcoes_filtro() TO authenticated;
GRANT EXECUTE ON FUNCTION public.analistas_analise(text) TO authenticated;