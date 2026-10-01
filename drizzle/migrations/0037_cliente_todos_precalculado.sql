CREATE MATERIALIZED VIEW analitico.mv_cliente_todos AS
WITH b AS (
  SELECT
    o.produto,
    o.ano,
    o.mes,
    COALESCE(NULLIF(btrim(o.modalidade), ''), 'Não informado') AS modalidade,
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
)
SELECT
  produto, ano, mes, modalidade,
  CASE
    WHEN GROUPING(rota) = 0 AND GROUPING(coloader) = 0 THEN 5::smallint
    WHEN GROUPING(rota) = 0 THEN 1::smallint
    WHEN GROUPING(coloader) = 0 THEN 2::smallint
    WHEN GROUPING(agente) = 0 THEN 3::smallint
    WHEN GROUPING(motivo) = 0 THEN 4::smallint
    WHEN GROUPING(cliente) = 0 THEN 6::smallint
    ELSE 7::smallint
  END AS tipo,
  COALESCE(rota, coloader, agente, motivo, cliente, oferta) AS item,
  CASE WHEN GROUPING(rota) = 0 AND GROUPING(coloader) = 0 THEN coloader END AS item2,
  count(*)::int AS n, sum(ap)::int AS ap, sum(rp)::int AS rp, sum(ea)::int AS ea
FROM b
GROUP BY GROUPING SETS (
  (produto, ano, mes, modalidade, rota),
  (produto, ano, mes, modalidade, coloader),
  (produto, ano, mes, modalidade, agente),
  (produto, ano, mes, modalidade, motivo),
  (produto, ano, mes, modalidade, rota, coloader),
  (produto, ano, mes, modalidade, cliente),
  (produto, ano, mes, modalidade, oferta)
);

CREATE INDEX mv_cliente_todos_idx ON analitico.mv_cliente_todos (tipo, produto, modalidade, ano, mes);

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
SET search_path = public, analitico
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

  WITH f AS MATERIALIZED (
    SELECT tipo, item, item2, n, ap, rp, ea
    FROM analitico.mv_cliente_todos m
    WHERE m.produto = ANY (v_produtos)
      AND (COALESCE(cardinality(p_anos), 0) = 0 OR m.ano = ANY (p_anos))
      AND (COALESCE(cardinality(p_meses), 0) = 0 OR m.mes = ANY (p_meses))
      AND (COALESCE(p_modalidade, 'Todos') = 'Todos' OR m.modalidade = p_modalidade)
  ),
  g AS (
    SELECT tipo, item, item2, sum(n)::int AS n, sum(ap)::int AS ap, sum(rp)::int AS rp, sum(ea)::int AS ea
    FROM f GROUP BY tipo, item, item2
  )
  SELECT jsonb_build_object(
    'totais', jsonb_build_object(
      'rotas', (SELECT COALESCE(sum(n),0) FROM g WHERE tipo = 2),
      'aprovadas', (SELECT COALESCE(sum(ap),0) FROM g WHERE tipo = 2),
      'reprovadas', (SELECT COALESCE(sum(rp),0) FROM g WHERE tipo = 2),
      'emAnalise', (SELECT COALESCE(sum(ea),0) FROM g WHERE tipo = 2),
      'ofertas', (SELECT count(*) FROM g WHERE tipo = 7 AND item IS NOT NULL),
      'clientes', (SELECT count(*) FROM g WHERE tipo = 6),
      'rotasDistintas', (SELECT count(*) FROM g WHERE tipo = 1),
      'coloaders', (SELECT count(*) FROM g WHERE tipo = 2)),
    'rotas', COALESCE((SELECT jsonb_agg(x) FROM (SELECT item, n, ap, rp, ea FROM g WHERE tipo = 1 ORDER BY n DESC, item LIMIT v_lim) x), '[]'),
    'coloaders', COALESCE((SELECT jsonb_agg(x) FROM (SELECT item, n, ap, rp, ea FROM g WHERE tipo = 2 ORDER BY n DESC, item LIMIT v_lim) x), '[]'),
    'agentes', COALESCE((SELECT jsonb_agg(x) FROM (SELECT item, n, ap, rp, ea FROM g WHERE tipo = 3 ORDER BY n DESC, item LIMIT v_lim) x), '[]'),
    'motivos', COALESCE((SELECT jsonb_agg(x) FROM (SELECT item, rp FROM g WHERE tipo = 4 AND rp > 0 ORDER BY rp DESC, item) x), '[]'),
    'rotaColoader', COALESCE((SELECT jsonb_agg(x) FROM (SELECT item AS rota, item2 AS coloader, n, ap, rp, ea FROM g WHERE tipo = 5 ORDER BY rp DESC, n DESC, item, item2 LIMIT v_lim) x), '[]')
  ) INTO v_res;

  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.cliente_todos_analise(integer[], integer[], text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cliente_todos_analise(integer[], integer[], text, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.atualizar_analises_frete()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'analitico'
AS $function$ begin
refresh materialized view analitico.mv_ofertas_frete_slim;
refresh materialized view analitico.mv_modalidade_frete_opcoes;
refresh materialized view analitico.mv_dashboard_frete;
refresh materialized view analitico.mv_dashboard_resumo_frete;
refresh materialized view analitico.mv_qualidade_resumo_frete;
refresh materialized view analitico.mv_cliente_todos;
end $function$;

NOTIFY pgrst, 'reload schema';