-- Qualidade dos Dados (aba QUALIDADE_DADOS da planilha).
-- Agregações no banco; Produto garantido pela RLS de public.ofertas.
-- Inclui_Filtro ≈ produto is not null.

create or replace function public.qualidade_dados_analise()
returns jsonb
language sql
stable
set search_path = public
as $$
  with base as (
    select
      o.oferta,
      o.cliente,
      o.intermediario,
      o.revisao,
      o.rota,
      o.modalidade,
      o.incoterm,
      o.origem_carga,
      o.origem,
      o.destino,
      o.destino_final,
      o.vendedor,
      o.status,
      o.analise,
      o.motivo,
      o.descricao_motivo,
      o.data_fim_sales_support,
      o.armador,
      o.agente,
      o.data_abertura,
      o.container,
      o.validade_de,
      o.validade_ate,
      o.complemento_incoterm,
      o.data_conclusao,
      o.inside_sales,
      coalesce(nullif(btrim(o.armador), ''), '(Não informado)') as coloader_analitico,
      case
        when nullif(btrim(o.origem), '') is null
          or nullif(btrim(o.destino), '') is null
        then '(Rota incompleta)'
        else btrim(o.origem) || ' → ' || btrim(o.destino)
      end as rota_analitica,
      coalesce(nullif(btrim(o.motivo), ''), '(Não informado)') as motivo_perda_analitico,
      (o.analise = 'Reprovado')::integer as flag_reprovada
    from public.ofertas o
    where o.produto is not null
  ),
  totais as (
    select
      count(*)::bigint as linhas_base,
      count(distinct oferta)::bigint as ofertas_unicas,
      count(*) filter (where coloader_analitico = '(Não informado)')::bigint
        as armador_nao_informado,
      count(*) filter (
        where flag_reprovada = 1
          and motivo_perda_analitico = '(Não informado)'
      )::bigint as motivo_ausente_reprovacoes,
      count(*) filter (where data_abertura is null)::bigint
        as data_abertura_ausente,
      count(*) filter (where rota_analitica = '(Rota incompleta)')::bigint
        as rota_incompleta,
      count(*) filter (
        where flag_reprovada = 1
          and (descricao_motivo is null or descricao_motivo = '')
      )::bigint as descricao_ausente_reprovacoes,

      -- Preenchidos (COUNTA) / Em branco (COUNTBLANK)
      -- selectionMode, validade_rota, ft_venda e tipo_cotacao ainda não
      -- existem em public.ofertas → sempre em branco (equivalente a coluna vazia).
      0::bigint as p_selection_mode,
      count(*) filter (where oferta is not null and oferta <> '')::bigint as p_oferta,
      count(*) filter (where cliente is not null and cliente <> '')::bigint as p_pessoa,
      count(*) filter (where intermediario is not null and intermediario <> '')::bigint
        as p_intermediario,
      count(*) filter (where revisao is not null)::bigint as p_revisao,
      count(*) filter (where rota is not null and rota <> '')::bigint as p_rota,
      count(*) filter (where modalidade is not null and modalidade <> '')::bigint
        as p_modalidade,
      count(*) filter (where incoterm is not null and incoterm <> '')::bigint
        as p_incoterm,
      count(*) filter (where origem_carga is not null and origem_carga <> '')::bigint
        as p_origem_carga,
      count(*) filter (where origem is not null and origem <> '')::bigint as p_origem,
      count(*) filter (where destino is not null and destino <> '')::bigint as p_destino,
      count(*) filter (where destino_final is not null and destino_final <> '')::bigint
        as p_destino_final,
      count(*) filter (where vendedor is not null and vendedor <> '')::bigint
        as p_vendedor,
      count(*) filter (where status is not null and status <> '')::bigint as p_status,
      count(*) filter (where analise is not null and analise <> '')::bigint as p_analise,
      count(*) filter (where motivo is not null and motivo <> '')::bigint as p_motivo,
      count(*) filter (
        where descricao_motivo is not null and descricao_motivo <> ''
      )::bigint as p_descricao_motivo,
      count(*) filter (where data_fim_sales_support is not null)::bigint
        as p_data_fim_sales_support,
      0::bigint as p_validade_rota,
      count(*) filter (where armador is not null and armador <> '')::bigint as p_armador,
      count(*) filter (where agente is not null and agente <> '')::bigint as p_agente,
      count(*) filter (where data_abertura is not null)::bigint as p_data_abertura,
      count(*) filter (where container is not null and container <> '')::bigint
        as p_container,
      0::bigint as p_ft_venda,
      count(*) filter (where validade_de is not null)::bigint as p_validade_de,
      count(*) filter (where validade_ate is not null)::bigint as p_validade_ate,
      count(*) filter (
        where complemento_incoterm is not null and complemento_incoterm <> ''
      )::bigint as p_complemento_incoterm,
      count(*) filter (where data_conclusao is not null)::bigint as p_data_analise,
      count(*) filter (where inside_sales is not null and inside_sales <> '')::bigint
        as p_inside_sales,
      0::bigint as p_tipo_cotacao
    from base
  )
  select jsonb_build_object(
    'linhas_base', linhas_base,
    'indicadores', jsonb_build_array(
      jsonb_build_object(
        'indicador', 'linhas da base',
        'quantidade', linhas_base,
        'impacto', 'alternativas de rota'
      ),
      jsonb_build_object(
        'indicador', 'ofertas unicas',
        'quantidade', ofertas_unicas,
        'impacto', 'numeros de oferta distintos'
      ),
      jsonb_build_object(
        'indicador', 'armador nao informado',
        'quantidade', armador_nao_informado,
        'impacto', 'limita analise de coloader'
      ),
      jsonb_build_object(
        'indicador', 'motivo ausente em reprovacoes',
        'quantidade', motivo_ausente_reprovacoes,
        'impacto', 'limita diagnostico de reprovacoes'
      ),
      jsonb_build_object(
        'indicador', 'data de abertura ausente',
        'quantidade', data_abertura_ausente,
        'impacto', 'limita periodo e aging'
      ),
      jsonb_build_object(
        'indicador', 'rota incompleta',
        'quantidade', rota_incompleta,
        'impacto', 'origem ou destino ausente'
      ),
      jsonb_build_object(
        'indicador', 'descricao ausente nas reprovacoes',
        'quantidade', descricao_ausente_reprovacoes,
        'impacto', 'limita analise qualitativa'
      )
    ),
    'campos', jsonb_build_array(
      jsonb_build_object('campo', 'selectionMode', 'preenchidos', p_selection_mode),
      jsonb_build_object('campo', 'oferta', 'preenchidos', p_oferta),
      jsonb_build_object('campo', 'pessoa', 'preenchidos', p_pessoa),
      jsonb_build_object('campo', 'intermediário', 'preenchidos', p_intermediario),
      jsonb_build_object('campo', 'revisao', 'preenchidos', p_revisao),
      jsonb_build_object('campo', 'rota', 'preenchidos', p_rota),
      jsonb_build_object('campo', 'modalidade', 'preenchidos', p_modalidade),
      jsonb_build_object('campo', 'incoterm', 'preenchidos', p_incoterm),
      jsonb_build_object('campo', 'origem de carga', 'preenchidos', p_origem_carga),
      jsonb_build_object('campo', 'origem', 'preenchidos', p_origem),
      jsonb_build_object('campo', 'destino', 'preenchidos', p_destino),
      jsonb_build_object('campo', 'destino final', 'preenchidos', p_destino_final),
      jsonb_build_object('campo', 'vendedor', 'preenchidos', p_vendedor),
      jsonb_build_object('campo', 'status', 'preenchidos', p_status),
      jsonb_build_object('campo', 'analise', 'preenchidos', p_analise),
      jsonb_build_object('campo', 'motivo', 'preenchidos', p_motivo),
      jsonb_build_object('campo', 'descricao do motivo', 'preenchidos', p_descricao_motivo),
      jsonb_build_object(
        'campo', 'data fim sales support', 'preenchidos', p_data_fim_sales_support
      ),
      jsonb_build_object('campo', 'validade rota', 'preenchidos', p_validade_rota),
      jsonb_build_object('campo', 'armador', 'preenchidos', p_armador),
      jsonb_build_object('campo', 'agente', 'preenchidos', p_agente),
      jsonb_build_object('campo', 'data abertura', 'preenchidos', p_data_abertura),
      jsonb_build_object('campo', 'container', 'preenchidos', p_container),
      jsonb_build_object('campo', 'ft. venda', 'preenchidos', p_ft_venda),
      jsonb_build_object('campo', 'validade de', 'preenchidos', p_validade_de),
      jsonb_build_object('campo', 'validade ate', 'preenchidos', p_validade_ate),
      jsonb_build_object(
        'campo', 'complemento de incoterm', 'preenchidos', p_complemento_incoterm
      ),
      jsonb_build_object('campo', 'data analise', 'preenchidos', p_data_analise),
      jsonb_build_object(
        'campo',
        'responsavel comercial/inside sales',
        'preenchidos',
        p_inside_sales
      ),
      jsonb_build_object('campo', 'tipo cotação', 'preenchidos', p_tipo_cotacao)
    )
  )
  from totais;
$$;

revoke all on function public.qualidade_dados_analise() from public, anon;
grant execute on function public.qualidade_dados_analise() to authenticated;
