-- Dashboard: base ordenada fisicamente por produto/tipo de frete (leitura sequencial)
drop materialized view analitico.mv_dashboard_frete;
create materialized view analitico.mv_dashboard_frete as SELECT produto,
 coalesce(nullif(btrim(modalidade), ''), 'Não informado') as modalidade_f,
 oferta,
 COALESCE(NULLIF(btrim(pricing), ''), '(Não informado)') AS analista,
 COALESCE(NULLIF(btrim(vendedor), ''), '(Não informado)') AS vendedor,
 COALESCE(NULLIF(btrim(cliente), ''), '(Não informado)') AS cliente,
 COALESCE(NULLIF(btrim(origem), ''), '(Não informado)') AS origem,
 COALESCE(NULLIF(btrim(destino), ''), '(Não informado)') AS destino,
 ((COALESCE(NULLIF(btrim(origem), ''), 'Não informado') || ' → ') || COALESCE(NULLIF(btrim(destino), ''), 'Não informado')) AS rota,
 COALESCE(NULLIF(btrim(armador), ''), '(Não informado)') AS coloader,
 btrim(COALESCE(analise, '')) AS resultado,
 COALESCE(NULLIF(btrim(motivo), ''), '(Não informado)') AS motivo,
 data_abertura,
 ((analise = 'Aprovado'))::integer AS apr, ((analise = 'Reprovado'))::integer AS rep, ((analise = 'Em Aberto'))::integer AS ema,
 to_char((data_abertura)::timestamp with time zone, 'YYYY-MM') AS mes
 FROM public.ofertas o WHERE produto IS NOT NULL
 ORDER BY 1, 2, data_abertura;
create index mv_dashboard_frete_idx on analitico.mv_dashboard_frete (produto, modalidade_f, data_abertura);
revoke all on analitico.mv_dashboard_frete from public, anon, authenticated;

-- Versão interna por lista explícita de produtos (usada só para pré-cálculo)
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.dashboard_analise_frete'::regproc);
  d := replace(d, 'public.dashboard_analise_frete(', 'analitico.dashboard_frete_calc(p_prods text[], ');
  d := replace(d, 'public.produtos_do_usuario()', 'p_prods');
  execute d;
end
$do$;
revoke all on function analitico.dashboard_frete_calc from public, anon, authenticated;

create materialized view analitico.mv_dashboard_resumo_frete as
select x.produto, x.modalidade_f,
       (select min(data_abertura) from analitico.mv_dashboard_frete b where b.produto = x.produto and b.modalidade_f = x.modalidade_f) as data_inicial,
       (select max(data_abertura) from analitico.mv_dashboard_frete b where b.produto = x.produto and b.modalidade_f = x.modalidade_f) as data_final,
       analitico.dashboard_frete_calc(array[x.produto], p_modalidade => x.modalidade_f) as payload
from analitico.mv_modalidade_frete_opcoes x;
create unique index mv_dashboard_resumo_frete_idx on analitico.mv_dashboard_resumo_frete (produto, modalidade_f);
revoke all on analitico.mv_dashboard_resumo_frete from public, anon, authenticated;

create or replace function public.dashboard_analise_frete_rapido(p_data_inicial date DEFAULT NULL, p_data_final date DEFAULT NULL, p_analista text DEFAULT 'Todos', p_vendedor text DEFAULT 'Todos', p_cliente text DEFAULT 'Todos', p_origem text DEFAULT 'Todos', p_destino text DEFAULT 'Todos', p_rota text DEFAULT 'Todos', p_coloader text DEFAULT 'Todos', p_resultado text DEFAULT 'Todos', p_motivo text DEFAULT 'Todos', p_min_decisoes integer DEFAULT 5, p_modalidade text DEFAULT 'Todos')
returns jsonb language plpgsql stable security definer set search_path = public, analitico as $$
declare v_prods text[]; v_r analitico.mv_dashboard_resumo_frete%rowtype;
begin
  v_prods := public.produtos_do_usuario();
  if array_length(v_prods, 1) = 1 and p_min_decisoes = 5
     and coalesce(p_analista,'Todos')='Todos' and coalesce(p_vendedor,'Todos')='Todos' and coalesce(p_cliente,'Todos')='Todos'
     and coalesce(p_origem,'Todos')='Todos' and coalesce(p_destino,'Todos')='Todos' and coalesce(p_rota,'Todos')='Todos'
     and coalesce(p_coloader,'Todos')='Todos' and coalesce(p_resultado,'Todos')='Todos' and coalesce(p_motivo,'Todos')='Todos' then
    select * into v_r from analitico.mv_dashboard_resumo_frete where produto = v_prods[1] and modalidade_f = p_modalidade;
    if not found then
      return analitico.dashboard_frete_calc(array[]::text[], p_modalidade => p_modalidade);
    end if;
    if (p_data_inicial is null or p_data_inicial <= v_r.data_inicial) and (p_data_final is null or p_data_final >= v_r.data_final) then
      return v_r.payload;
    end if;
  end if;
  return public.dashboard_analise_frete(p_data_inicial, p_data_final, p_analista, p_vendedor, p_cliente, p_origem, p_destino, p_rota, p_coloader, p_resultado, p_motivo, p_min_decisoes, p_modalidade);
end $$;
revoke all on function public.dashboard_analise_frete_rapido from public, anon;
grant execute on function public.dashboard_analise_frete_rapido to authenticated;

-- Qualidade dos Dados: resumo mensal por produto e tipo de frete
create materialized view analitico.mv_qualidade_resumo_frete AS
WITH b AS (
  SELECT o.*, extract(year from o.data_abertura)::integer AS ano_f, extract(month from o.data_abertura)::integer AS mes_f,
         coalesce(nullif(btrim(o.modalidade), ''), 'Não informado') AS modalidade_f
  FROM public.ofertas o WHERE o.produto IS NOT NULL
), c AS (
  SELECT o.produto, o.modalidade_f, o.ano_f, o.mes_f, count(*) AS linhas_base,
 count(*) FILTER (WHERE btrim(COALESCE(o.cliente,''))='') AS sem_cliente,
 count(*) FILTER (WHERE btrim(COALESCE(o.origem,''))='' OR btrim(COALESCE(o.destino,''))='') AS sem_origem_destino,
 count(*) FILTER (WHERE btrim(COALESCE(o.armador,''))='') AS sem_armador,
 count(*) FILTER (WHERE btrim(COALESCE(o.agente,''))='') AS sem_agente,
 count(*) FILTER (WHERE btrim(COALESCE(o.analise,''))='') AS sem_analise,
 count(*) FILTER (WHERE o.analise='Reprovado' AND btrim(COALESCE(o.motivo,''))='') AS reprovadas_sem_motivo,
 count(*) FILTER (WHERE o.data_abertura IS NULL) AS sem_data_abertura,
 count(*) FILTER (WHERE o.data_abertura IS NOT NULL AND o.data_conclusao IS NOT NULL AND o.data_conclusao < o.data_abertura) AS conclusao_anterior,
 count(*) FILTER (WHERE btrim(COALESCE(o.cliente,''))<>'') AS cliente_preenchido,
 count(*) FILTER (WHERE btrim(COALESCE(o.origem,''))<>'') AS origem_preenchida,
 count(*) FILTER (WHERE btrim(COALESCE(o.destino,''))<>'') AS destino_preenchido,
 count(*) FILTER (WHERE btrim(COALESCE(o.armador,''))<>'') AS armador_preenchido,
 count(*) FILTER (WHERE btrim(COALESCE(o.agente,''))<>'') AS agente_preenchido,
 count(*) FILTER (WHERE btrim(COALESCE(o.vendedor,''))<>'') AS vendedor_preenchido,
 count(*) FILTER (WHERE btrim(COALESCE(o.pricing,''))<>'') AS pricing_preenchido,
 count(*) FILTER (WHERE btrim(COALESCE(o.analise,''))<>'') AS analise_preenchida,
 count(*) FILTER (WHERE btrim(COALESCE(o.motivo,''))<>'') AS motivo_preenchido,
 count(*) FILTER (WHERE btrim(COALESCE(o.modalidade,''))<>'') AS modalidade_preenchida,
 count(*) FILTER (WHERE btrim(COALESCE(o.incoterm,''))<>'') AS incoterm_preenchido,
 count(*) FILTER (WHERE o.data_abertura IS NOT NULL) AS data_abertura_preenchida
  FROM b o GROUP BY o.produto, o.modalidade_f, o.ano_f, o.mes_f
), d AS (
  SELECT produto, modalidade_f, ano_f, mes_f, COALESCE(sum(qtd-1),0)::bigint AS registros_duplicados
  FROM (SELECT produto, modalidade_f, ano_f, mes_f, oferta, revisao, count(*) qtd FROM b
        GROUP BY produto, modalidade_f, ano_f, mes_f, oferta, revisao HAVING count(*)>1) x
  GROUP BY produto, modalidade_f, ano_f, mes_f
)
SELECT c.*, COALESCE(d.registros_duplicados,0)::bigint AS registros_duplicados
FROM c LEFT JOIN d ON d.produto=c.produto AND d.modalidade_f=c.modalidade_f AND d.ano_f IS NOT DISTINCT FROM c.ano_f AND d.mes_f IS NOT DISTINCT FROM c.mes_f;
CREATE INDEX mv_qualidade_resumo_frete_idx ON analitico.mv_qualidade_resumo_frete (produto, modalidade_f, ano_f, mes_f);
REVOKE ALL ON analitico.mv_qualidade_resumo_frete FROM public, anon, authenticated;

do $do$
declare d text;
begin
  d := pg_get_functiondef('public.qualidade_dados_analise_periodo_calc'::regproc);
  d := replace(d, 'public.qualidade_dados_analise_periodo_calc(p_anos integer[] DEFAULT NULL::integer[], p_meses integer[] DEFAULT NULL::integer[])',
                  'public.qualidade_dados_analise_frete(p_anos integer[] DEFAULT NULL::integer[], p_meses integer[] DEFAULT NULL::integer[], p_modalidade text DEFAULT ''Todos''::text)');
  d := replace(d, 'FROM analitico.mv_qualidade_resumo_per
  WHERE produto = ANY (public.produtos_do_usuario())',
                  'FROM analitico.mv_qualidade_resumo_frete
  WHERE produto = ANY (public.produtos_do_usuario()) AND modalidade_f = p_modalidade');
  if position('mv_qualidade_resumo_frete' in d) = 0 or position('qualidade_dados_analise_frete' in d) = 0 then
    raise exception 'qualidade frete: substituicao falhou';
  end if;
  execute d;
end
$do$;
revoke all on function public.qualidade_dados_analise_frete from public, anon;
grant execute on function public.qualidade_dados_analise_frete to authenticated;

drop index if exists analitico.mv_ofertas_periodo_frete_idx;

create or replace function public.atualizar_analises_frete() returns void language plpgsql security definer set search_path = public, analitico as $$ begin
refresh materialized view analitico.mv_ofertas_frete_slim;
refresh materialized view analitico.mv_modalidade_frete_opcoes;
refresh materialized view analitico.mv_dashboard_frete;
refresh materialized view analitico.mv_dashboard_resumo_frete;
refresh materialized view analitico.mv_qualidade_resumo_frete;
end $$;
revoke all on function public.atualizar_analises_frete from public, anon, authenticated;
notify pgrst, 'reload schema';