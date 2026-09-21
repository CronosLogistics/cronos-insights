// ============================================================================
// Calculadora / montagem da aba DASHBOARD da planilha ANALISE COTAÇÕES.
//
// Recebe agregações já filtradas (Inclui_Filtro / produto via RLS + filtros
// globais) e formata indicadores, oportunidades, evolução mensal e tendência.
// ============================================================================

import { formatarPct, MIN_DECISOES } from "@/lib/customer-analysis";

export { formatarPct, MIN_DECISOES };

export const FILTRO_TODOS = "Todos";

export type FiltrosDashboard = {
  dataInicial: string | null;
  dataFinal: string | null;
  analista: string;
  vendedor: string;
  cliente: string;
  origem: string;
  destino: string;
  rota: string;
  coloader: string;
  resultado: string;
  motivo: string;
};

export type DashboardOpcoesFiltro = {
  dataInicial: string | null;
  dataFinal: string | null;
  analistas: string[];
  vendedores: string[];
  clientes: string[];
  origens: string[];
  destinos: string[];
  rotas: string[];
  coloaders: string[];
  resultados: string[];
  motivos: string[];
};

export type IndicadoresAlternativas = {
  total: number;
  aprovadas: number;
  reprovadas: number;
  emAnalise: number;
  taxaAprovacao: number;
  taxaReprovacao: number;
  clientes: number;
  rotas: number;
  coloaders: number;
};

export type IndicadoresOfertasUnicas = {
  total: number;
  aprovadas: number;
  reprovadas: number;
  emAnalise: number;
  taxaAprovacao: number;
  taxaReprovacao: number;
};

export type LinhaEvolucaoMensal = {
  mes: string;
  rotas: number;
  aprovadas: number;
  reprovadas: number;
  conversao: number;
};

export type OportunidadeTom =
  | "impacto"
  | "estrategico"
  | "reprovacao"
  | "concentracao"
  | "atencao"
  | "tendencia"
  | "destaque";

export type OportunidadeItem = {
  id: string;
  titulo: string;
  /** Entidade ou contexto curto (ex.: rota, cliente). */
  detalhe: string;
  /** Valor em destaque (ex.: "18,2%", "38 dias"). */
  metrica: string;
  /** Texto auxiliar sob a métrica. */
  contexto: string;
  badge: string;
  tom: OportunidadeTom;
  /** Texto completo para acessibilidade / fallback. */
  texto: string;
};

export type AnaliseDashboard = {
  filtros: FiltrosDashboard;
  alternativas: IndicadoresAlternativas;
  ofertasUnicas: IndicadoresOfertasUnicas;
  oportunidades: OportunidadeItem[];
  evolucaoMensal: LinhaEvolucaoMensal[];
};

export type AgregadoDashboard = {
  alternativas?: {
    total?: number | null;
    aprovadas?: number | null;
    reprovadas?: number | null;
    em_analise?: number | null;
    taxa_aprovacao?: number | null;
    taxa_reprovacao?: number | null;
    clientes?: number | null;
    rotas?: number | null;
    coloaders?: number | null;
  };
  ofertas_unicas?: {
    total?: number | null;
    aprovadas?: number | null;
    reprovadas?: number | null;
    em_analise?: number | null;
    taxa_aprovacao?: number | null;
    taxa_reprovacao?: number | null;
  };
  evolucao_mensal?: Array<{
    mes?: string | null;
    rotas?: number | null;
    aprovadas?: number | null;
    reprovadas?: number | null;
    conversao?: number | null;
  }> | null;
  oportunidades?: {
    rota_baixo?: { item?: string | null; volume?: number | null; conversao?: number | null } | null;
    cliente_baixo?: {
      item?: string | null;
      volume?: number | null;
      conversao?: number | null;
    } | null;
    melhor_rota_coloader?: {
      rota?: string | null;
      coloader?: string | null;
      conversao?: number | null;
      decisoes?: number | null;
    } | null;
    motivo_recorrente?: {
      motivo?: string | null;
      reprovacoes?: number | null;
      pct?: number | null;
    } | null;
    concentracao?: {
      rota?: string | null;
      coloader?: string | null;
      concentracao?: number | null;
      volume_rota?: number | null;
    } | null;
  };
};

function num(valor: number | null | undefined): number {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** ROUND(x*100;1) da planilha, com vírgula pt-BR (ex.: 17,2 ou 100). */
export function arredPctPlanilha(valor: number): string {
  if (!Number.isFinite(valor)) return "0";
  const n = Math.round(valor * 1000) / 10;
  return n.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
}

const MESES_CURTOS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const;

/** Equivale a TEXT(mês;"mmm/aaaa") em pt-BR. */
export function formatarMesCurto(mes: string): string {
  const m = mes.trim();
  const match = /^(\d{4})-(\d{2})/.exec(m);
  if (!match) return m;
  const ano = Number(match[1]);
  const mesIdx = Number(match[2]) - 1;
  if (mesIdx < 0 || mesIdx > 11) return m;
  return `${MESES_CURTOS[mesIdx]}/${ano}`;
}

/** Rótulo de tabela mm/aaaa. */
export function formatarMesTabela(mes: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(mes.trim());
  if (!match) return mes;
  return `${match[2]}/${match[1]}`;
}

export type CotacaoAntigaResumo = {
  oferta: string;
  cliente: string;
  rota: string;
  diasEmAberto: number | null;
} | null;

function montarTendencia(evolucao: LinhaEvolucaoMensal[]): string {
  if (evolucao.length < 2) return "Série mensal insuficiente";
  const atual = evolucao[evolucao.length - 1]!;
  const anterior = evolucao[evolucao.length - 2]!;
  const diff = atual.conversao - anterior.conversao;
  const sinal = diff >= 0 ? "+" : "";
  return (
    `Mês mais recente: ${formatarMesCurto(atual.mes)} — ${arredPctPlanilha(atual.conversao)}% ` +
    `(${sinal}${arredPctPlanilha(diff)} p.p. vs. anterior)`
  );
}

function montarOportunidades(
  raw: AgregadoDashboard["oportunidades"],
  evolucao: LinhaEvolucaoMensal[],
  cotacaoAntiga: CotacaoAntigaResumo,
): OportunidadeItem[] {
  const rotaBaixo = raw?.rota_baixo;
  const clienteBaixo = raw?.cliente_baixo;
  const melhor = raw?.melhor_rota_coloader;
  const motivo = raw?.motivo_recorrente;
  const conc = raw?.concentracao;

  const metricaRota = rotaBaixo?.item
    ? `${arredPctPlanilha(num(rotaBaixo.conversao))}%`
    : "—";
  const contextoRota = rotaBaixo?.item
    ? `de conversão em ${num(rotaBaixo.volume).toLocaleString("pt-BR")} rotas`
    : "sem amostra no filtro";
  const detalheRota = rotaBaixo?.item ?? "Nenhuma rota atende ao critério atual";
  const textoRota = rotaBaixo?.item
    ? `${detalheRota} — ${metricaRota} ${contextoRota}`
    : detalheRota;

  const metricaCliente = clienteBaixo?.item
    ? `${arredPctPlanilha(num(clienteBaixo.conversao))}%`
    : "—";
  const contextoCliente = clienteBaixo?.item
    ? `de conversão em ${num(clienteBaixo.volume).toLocaleString("pt-BR")} rotas`
    : "sem amostra no filtro";
  const detalheCliente = clienteBaixo?.item ?? "Nenhum cliente atende ao critério atual";
  const textoCliente = clienteBaixo?.item
    ? `${detalheCliente} — ${metricaCliente} ${contextoCliente}`
    : detalheCliente;

  const temMelhor = Boolean(melhor?.rota && melhor?.coloader);
  const detalheMelhor = temMelhor
    ? `${melhor!.rota}\n${melhor!.coloader}`
    : "Sem combinação com amostra mínima";
  const metricaMelhor = temMelhor
    ? `${arredPctPlanilha(num(melhor!.conversao))}%`
    : "—";
  const contextoMelhor = temMelhor
    ? `${num(melhor!.decisoes).toLocaleString("pt-BR")} decisões`
    : "amostra insuficiente";
  const textoMelhor = temMelhor
    ? `${melhor!.rota} + ${melhor!.coloader} — ${metricaMelhor} / ${contextoMelhor}`
    : detalheMelhor;

  const detalheMotivo = motivo?.motivo ?? "Sem reprovações no filtro atual";
  const metricaMotivo = motivo?.motivo
    ? num(motivo.reprovacoes).toLocaleString("pt-BR")
    : "—";
  const contextoMotivo = motivo?.motivo
    ? `reprovações (${arredPctPlanilha(num(motivo.pct))}%)`
    : "sem dados";
  const textoMotivo = motivo?.motivo
    ? `${detalheMotivo} — ${metricaMotivo} ${contextoMotivo}`
    : detalheMotivo;

  const temConc = Boolean(conc?.rota && conc?.coloader);
  const detalheConc = temConc
    ? `${conc!.rota}\n${conc!.coloader}`
    : "Sem rota de alto volume";
  const metricaConc = temConc
    ? `${arredPctPlanilha(num(conc!.concentracao))}%`
    : "—";
  const contextoConc = temConc
    ? `de ${num(conc!.volume_rota).toLocaleString("pt-BR")} rotas`
    : "sem dados";
  const textoConc = temConc
    ? `${conc!.rota} — ${conc!.coloader} concentra ${metricaConc} de ${num(conc!.volume_rota).toLocaleString("pt-BR")} rotas`
    : detalheConc;

  const tendenciaTexto = montarTendencia(evolucao);
  let metricaTendencia = "—";
  let contextoTendencia = "série mensal";
  let detalheTendencia = tendenciaTexto;
  if (evolucao.length >= 2) {
    const atual = evolucao[evolucao.length - 1]!;
    const anterior = evolucao[evolucao.length - 2]!;
    const diff = atual.conversao - anterior.conversao;
    const sinal = diff >= 0 ? "+" : "";
    metricaTendencia = `${sinal}${arredPctPlanilha(diff)} p.p.`;
    contextoTendencia = `vs. ${formatarMesCurto(anterior.mes)}`;
    detalheTendencia = `${formatarMesCurto(atual.mes)} — ${arredPctPlanilha(atual.conversao)}%`;
  }

  let detalheCotacao = "Nenhuma rota em análise";
  let metricaCotacao = "—";
  let contextoCotacao = "em aberto";
  let textoCotacao = detalheCotacao;
  if (cotacaoAntiga) {
    const dias =
      cotacaoAntiga.diasEmAberto == null
        ? "—"
        : String(cotacaoAntiga.diasEmAberto);
    detalheCotacao = `${cotacaoAntiga.oferta} — ${cotacaoAntiga.cliente}`;
    metricaCotacao = cotacaoAntiga.diasEmAberto == null ? "—" : `${dias} dias`;
    contextoCotacao = "em aberto";
    textoCotacao = `${cotacaoAntiga.oferta} — ${cotacaoAntiga.cliente} — ${cotacaoAntiga.rota} — ${dias} dias em aberto`;
  }

  return [
    {
      id: "rota-baixo",
      titulo: "Rota alto volume + baixa conversão",
      detalhe: detalheRota,
      metrica: metricaRota,
      contexto: contextoRota,
      badge: "Maior impacto",
      tom: "impacto",
      texto: textoRota,
    },
    {
      id: "motivo-recorrente",
      titulo: "Motivo de reprovação recorrente",
      detalhe: detalheMotivo,
      metrica: metricaMotivo,
      contexto: contextoMotivo,
      badge: "Reprovação",
      tom: "reprovacao",
      texto: textoMotivo,
    },
    {
      id: "tendencia",
      titulo: "Tendência mensal",
      detalhe: detalheTendencia,
      metrica: metricaTendencia,
      contexto: contextoTendencia,
      badge: "Tendência",
      tom: "tendencia",
      texto: tendenciaTexto,
    },
    {
      id: "cliente-baixo",
      titulo: "Cliente alto volume + baixa conversão",
      detalhe: detalheCliente,
      metrica: metricaCliente,
      contexto: contextoCliente,
      badge: "Cliente estratégico",
      tom: "estrategico",
      texto: textoCliente,
    },
    {
      id: "concentracao",
      titulo: "Concentração de coloader por rota",
      detalhe: detalheConc,
      metrica: metricaConc,
      contexto: contextoConc,
      badge: "Concentração",
      tom: "concentracao",
      texto: textoConc,
    },
    {
      id: "melhor-rota-coloader",
      titulo: "Melhor rota + coloader",
      detalhe: detalheMelhor,
      metrica: metricaMelhor,
      contexto: contextoMelhor,
      badge: "Destaque",
      tom: "destaque",
      texto: textoMelhor,
    },
    {
      id: "cotacao-antiga",
      titulo: "Cotação em análise mais antiga",
      detalhe: detalheCotacao,
      metrica: metricaCotacao,
      contexto: contextoCotacao,
      badge: "Atenção",
      tom: "atencao",
      texto: textoCotacao,
    },
  ];
}

export function montarAnaliseDashboard(
  filtros: FiltrosDashboard,
  agregado: AgregadoDashboard,
  cotacaoAntiga: CotacaoAntigaResumo,
): AnaliseDashboard {
  const a = agregado.alternativas;
  const o = agregado.ofertas_unicas;

  const alternativas: IndicadoresAlternativas = {
    total: num(a?.total),
    aprovadas: num(a?.aprovadas),
    reprovadas: num(a?.reprovadas),
    emAnalise: num(a?.em_analise),
    taxaAprovacao: num(a?.taxa_aprovacao),
    taxaReprovacao: num(a?.taxa_reprovacao),
    clientes: num(a?.clientes),
    rotas: num(a?.rotas),
    coloaders: num(a?.coloaders),
  };

  const ofertasUnicas: IndicadoresOfertasUnicas = {
    total: num(o?.total),
    aprovadas: num(o?.aprovadas),
    reprovadas: num(o?.reprovadas),
    emAnalise: num(o?.em_analise),
    taxaAprovacao: num(o?.taxa_aprovacao),
    taxaReprovacao: num(o?.taxa_reprovacao),
  };

  const evolucaoMensal: LinhaEvolucaoMensal[] = (agregado.evolucao_mensal ?? []).map((l) => ({
    mes: (l.mes ?? "").toString(),
    rotas: num(l.rotas),
    aprovadas: num(l.aprovadas),
    reprovadas: num(l.reprovadas),
    conversao: num(l.conversao),
  }));

  return {
    filtros,
    alternativas,
    ofertasUnicas,
    oportunidades: montarOportunidades(agregado.oportunidades, evolucaoMensal, cotacaoAntiga),
    evolucaoMensal,
  };
}
