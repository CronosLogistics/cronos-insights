CREATE TABLE public.ofertas (
  id BIGSERIAL PRIMARY KEY,
  oferta TEXT NOT NULL,
  revisao INTEGER,
  cliente TEXT,
  intermediario TEXT,
  rota TEXT,
  modalidade TEXT,
  incoterm TEXT,
  complemento_incoterm TEXT,
  origem_carga TEXT,
  origem TEXT,
  destino TEXT,
  destino_final TEXT,
  pais_origem TEXT,
  pais_destino TEXT,
  continente TEXT,
  vendedor TEXT,
  inside_sales TEXT,
  pricing TEXT,
  usuario_abertura TEXT,
  status TEXT,
  analise TEXT,
  motivo TEXT,
  descricao_motivo TEXT,
  armador TEXT,
  agente TEXT,
  produto TEXT,
  container TEXT,
  servicos_adicionais TEXT,
  solicitacao TEXT,
  escritorio TEXT,
  data_abertura DATE,
  data_conclusao DATE,
  validade_de DATE,
  validade_ate DATE,
  data_fim_sales_support DATE,
  data_envio_pricing DATE,
  data_retorno_pricing DATE,
  mc_oferta_pct NUMERIC,
  peso_mercadoria NUMERIC,
  peso_aferido NUMERIC,
  teus NUMERIC,
  tempo_resposta_pricing_horas NUMERIC,
  mes INTEGER,
  ano INTEGER,
  mes_ano INTEGER,
  importado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (oferta, revisao)
);

CREATE INDEX idx_ofertas_data_abertura ON public.ofertas (data_abertura DESC);
CREATE INDEX idx_ofertas_status ON public.ofertas (status);
CREATE INDEX idx_ofertas_analise ON public.ofertas (analise);
CREATE INDEX idx_ofertas_cliente ON public.ofertas (cliente);
CREATE INDEX idx_ofertas_mes_ano ON public.ofertas (mes_ano);
CREATE INDEX idx_ofertas_modalidade ON public.ofertas (modalidade);

GRANT SELECT ON public.ofertas TO authenticated;
GRANT ALL ON public.ofertas TO service_role;
ALTER TABLE public.ofertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados podem consultar ofertas" ON public.ofertas FOR SELECT TO authenticated USING (true);

CREATE TABLE public.importacoes (
  id BIGSERIAL PRIMARY KEY,
  fonte TEXT NOT NULL DEFAULT 'onedrive:Ofertas.xlsx',
  arquivo_modificado_em TIMESTAMPTZ,
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em TIMESTAMPTZ,
  situacao TEXT NOT NULL DEFAULT 'em_andamento',
  linhas INTEGER,
  mensagem TEXT
);

GRANT SELECT ON public.importacoes TO authenticated;
GRANT ALL ON public.importacoes TO service_role;
ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados podem consultar importacoes" ON public.importacoes FOR SELECT TO authenticated USING (true);