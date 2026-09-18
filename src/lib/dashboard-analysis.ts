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

export type OportunidadeItem = {
  titulo: string;
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

  const textoRota = rotaBaixo?.item
    ? `${rotaBaixo.item} — ${arredPctPlanilha(num(rotaBaixo.conversao))}% de conversão em ${num(rotaBaixo.volume).toLocaleString("pt-BR")} rotas`
    : "Nenhuma rota atende ao critério atual";

  const textoCliente = clienteBaixo?.item
    ? `${clienteBaixo.item} — ${arredPctPlanilha(num(clienteBaixo.conversao))}% de conversão em ${num(clienteBaixo.volume).toLocaleString("pt-BR")} rotas`
    : "Nenhum cliente atende ao critério atual";

  const textoMelhor =
    melhor?.rota && melhor?.coloader
      ? `${melhor.rota} + ${melhor.coloader} — ${arredPctPlanilha(num(melhor.conversao))}% / ${num(melhor.decisoes).toLocaleString("pt-BR")} decisões`
      : "Sem combinação com amostra mínima";

  const textoMotivo = motivo?.motivo
    ? `${motivo.motivo} — ${num(motivo.reprovacoes).toLocaleString("pt-BR")} reprovações (${arredPctPlanilha(num(motivo.pct))}%)`
    : "Sem reprovações no filtro atual";

  const textoConc =
    conc?.rota && conc?.coloader
      ? `${conc.rota} — ${conc.coloader} concentra ${arredPctPlanilha(num(conc.concentracao))}% de ${num(conc.volume_rota).toLocaleString("pt-BR")} rotas`
      : "Sem rota de alto volume";

  let textoCotacao = "Nenhuma rota em análise";
  if (cotacaoAntiga) {
    const dias =
      cotacaoAntiga.diasEmAberto == null
        ? "—"
        : String(cotacaoAntiga.diasEmAberto);
    textoCotacao = `${cotacaoAntiga.oferta} — ${cotacaoAntiga.cliente} — ${cotacaoAntiga.rota} — ${dias} dias em aberto`;
  }

  return [
    { titulo: "Rota alto volume + baixa conversão", texto: textoRota },
    { titulo: "Cliente alto volume + baixa conversão", texto: textoCliente },
    { titulo: "Melhor rota + coloader (amostra relevante)", texto: textoMelhor },
    { titulo: "Motivo de reprovação recorrente", texto: textoMotivo },
    { titulo: "Concentração de coloader por rota", texto: textoConc },
    { titulo: "Cotação em análise mais antiga", texto: textoCotacao },
    { titulo: "Tendência mensal", texto: montarTendencia(evolucao) },
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
