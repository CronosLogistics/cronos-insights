// ============================================================================
// Calculadora pura da ficha "Analistas Pricing".
//
// Recebe agregações já filtradas (Inclui_Filtro / produto via RLS + filtro de
// Analista Pricing) e a média geral do produto, e reproduz a aba ANALISTAS
// da planilha "ANALISE COTAÇÕES".
// ============================================================================

import {
  formatarDiferenca,
  formatarPct,
  MIN_DECISOES,
  type Indicadores,
  type LinhaMotivo,
  type LinhaRanking,
} from "@/lib/customer-analysis";

export { formatarDiferenca, formatarPct, MIN_DECISOES };
export type { Indicadores, LinhaMotivo, LinhaRanking };

export const FILTRO_TODOS = "Todos";

/** Analista Pricing normalizado vazio → "(Não informado)" (ARRUMAR + vazio). */
export const ANALISTA_NAO_INFORMADO = "(Não informado)";

/** Perfil específico da aba ANALISTAS. */
export type PerfilAnalista = {
  clienteMaisCotado: string;
  rotaMaisCotada: string;
  melhorRota: string;
  piorRota: string;
  coloaderMaisUsado: string;
  agenteRecorrente: string;
};

/** Linha do cruzamento Rota × Agente. */
export type LinhaRotaAgente = {
  rota: string;
  agente: string;
  rotas: number;
  aprovadas: number;
  reprovadas: number;
  emAnalise: number;
  conversao: number;
};

/** Objeto completo consumido pela tela. */
export type AnaliseAnalistas = {
  analista: string;
  indicadores: Indicadores;
  perfil: PerfilAnalista;
  insightsPricing: string[];
  ondeAtuar: string[];
  clientes: LinhaRanking[];
  rotas: LinhaRanking[];
  coloaders: LinhaRanking[];
  motivos: LinhaMotivo[];
  rotaAgente: LinhaRotaAgente[];
};

const TOP_N = 10;
const SEM_DADOS = "—";

function inteiroBR(valor: number): string {
  return valor.toLocaleString("pt-BR");
}

function conversao(aprovadas: number, reprovadas: number): number {
  const decisoes = aprovadas + reprovadas;
  return decisoes > 0 ? aprovadas / decisoes : 0;
}

function num(valor: number | null | undefined): number {
  return Number(valor ?? 0);
}

/**
 * Equivale a ARRUMAR(Analista_Pricing) da planilha: trim + vazio → "(Não informado)".
 */
export function normalizarAnalista(valor: string | null | undefined): string {
  const t = (valor ?? "").trim().replace(/\s+/g, " ");
  return t === "" ? ANALISTA_NAO_INFORMADO : t;
}

type LinhaAgregada = {
  item: string;
  rotas: number;
  aprovadas: number;
  reprovadas: number;
  em_analise: number;
};

export type AgregadoAnalistas = {
  indicadores: {
    rotas: number;
    ofertas: number;
    clientes: number;
    rotas_distintas: number;
    coloaders: number;
    aprovadas: number;
    reprovadas: number;
    em_analise: number;
  };
  mediaAprovadas: number;
  mediaReprovadas: number;
  clientes: LinhaAgregada[];
  rotas: LinhaAgregada[];
  coloaders: LinhaAgregada[];
  agentes: LinhaAgregada[];
  motivosTotal: number;
  motivos: { motivo: string; reprovadas: number }[];
  rotaAgente: {
    rota: string;
    agente: string;
    rotas: number;
    aprovadas: number;
    reprovadas: number;
    em_analise: number;
  }[];
};

function ranking(linhas: LinhaAgregada[] | undefined): LinhaRanking[] {
  return (linhas ?? []).map((l) => ({
    item: l.item,
    rotas: num(l.rotas),
    aprovadas: num(l.aprovadas),
    reprovadas: num(l.reprovadas),
    emAnalise: num(l.em_analise),
    conversao: conversao(num(l.aprovadas), num(l.reprovadas)),
  }));
}

function maxPor(
  linhas: LinhaRanking[],
  valor: (l: LinhaRanking) => number,
  filtro?: (l: LinhaRanking) => boolean,
): LinhaRanking | undefined {
  const candidatas = filtro ? linhas.filter(filtro) : linhas;
  let melhor: LinhaRanking | undefined;
  for (const l of candidatas) {
    if (!melhor || valor(l) > valor(melhor)) melhor = l;
  }
  return melhor;
}

function minPor(
  linhas: LinhaRanking[],
  valor: (l: LinhaRanking) => number,
  filtro?: (l: LinhaRanking) => boolean,
): LinhaRanking | undefined {
  const candidatas = filtro ? linhas.filter(filtro) : linhas;
  let pior: LinhaRanking | undefined;
  for (const l of candidatas) {
    if (!pior || valor(l) < valor(pior)) pior = l;
  }
  return pior;
}

const semAmostra = `Amostra pequena — sem combinação com ${MIN_DECISOES} decisões`;

function montarPerfil(
  clientes: LinhaRanking[],
  rotas: LinhaRanking[],
  coloaders: LinhaRanking[],
  agentes: LinhaRanking[],
): PerfilAnalista {
  const relevante = (l: LinhaRanking) => l.aprovadas + l.reprovadas >= MIN_DECISOES;
  const melhor = maxPor(rotas, (l) => l.conversao, relevante);
  const pior = minPor(rotas, (l) => l.conversao, relevante);

  return {
    clienteMaisCotado: clientes[0]?.item ?? SEM_DADOS,
    rotaMaisCotada: rotas[0]?.item ?? SEM_DADOS,
    melhorRota: melhor ? melhor.item : semAmostra,
    piorRota: pior ? pior.item : semAmostra,
    coloaderMaisUsado: coloaders[0]?.item ?? SEM_DADOS,
    agenteRecorrente: agentes[0]?.item ?? SEM_DADOS,
  };
}

function montarInsightsPricing(ind: Indicadores, perfil: PerfilAnalista): string[] {
  const itens: string[] = [];

  itens.push(
    `O cliente mais recorrente é ${perfil.clienteMaisCotado}; a rota principal é ${perfil.rotaMaisCotada}.`,
  );

  itens.push(
    `Conversão de ${formatarPct(ind.conversaoRecorte)} vs. ${formatarPct(
      ind.mediaGeral,
    )} na base; ${inteiroBR(ind.decisoes)} decisões.`,
  );

  itens.push(
    `Coloader mais utilizado: ${perfil.coloaderMaisUsado}; agente mais recorrente: ${perfil.agenteRecorrente}.`,
  );

  if (ind.decisoes < MIN_DECISOES) {
    itens.push(`Amostra pequena — ${inteiroBR(ind.rotas)} rotas.`);
  } else {
    itens.push(`Melhor rota relevante: ${perfil.melhorRota}; pior: ${perfil.piorRota}.`);
  }

  return itens;
}

/**
 * Onde atuar — aba ANALISTAS:
 * - prioridade pelo recorte vs. média geral;
 * - principal motivo de reprovação;
 * - dependência pelo coloader mais usado;
 * - oportunidade textual fixa da planilha.
 */
function montarOndeAtuar(
  ind: Indicadores,
  perfil: PerfilAnalista,
  motivos: LinhaMotivo[],
): string[] {
  const itens: string[] = [];

  if (ind.decisoes < MIN_DECISOES) {
    itens.push("AMOSTRA PEQUENA — validar antes de agir.");
  } else if (ind.conversaoRecorte < ind.mediaGeral) {
    itens.push("ALTA PRIORIDADE — conversão abaixo da média geral.");
  } else {
    itens.push("PONTO FORTE — conversão igual ou acima da média geral.");
  }

  const motivo = motivos[0]?.motivo ?? SEM_DADOS;
  itens.push(`INVESTIGAR — principal motivo: ${motivo}.`);

  itens.push(`DEPENDÊNCIA — coloader mais usado: ${perfil.coloaderMaisUsado}.`);

  itens.push(
    "OPORTUNIDADE — revisar combinações de rota e coloader com maior volume e baixa conversão.",
  );

  return itens;
}

export function montarAnaliseAnalistas(
  analista: string,
  agregado: AgregadoAnalistas,
): AnaliseAnalistas {
  const i = agregado.indicadores;
  const aprovadas = num(i?.aprovadas);
  const reprovadas = num(i?.reprovadas);
  const decisoes = aprovadas + reprovadas;
  const conversaoRecorte = conversao(aprovadas, reprovadas);
  const mediaGeral = conversao(num(agregado.mediaAprovadas), num(agregado.mediaReprovadas));

  const indicadores: Indicadores = {
    rotas: num(i?.rotas),
    ofertas: num(i?.ofertas),
    aprovadas,
    reprovadas,
    emAnalise: num(i?.em_analise),
    taxaAprovacao: conversaoRecorte,
    taxaReprovacao: decisoes > 0 ? reprovadas / decisoes : 0,
    clientes: num(i?.clientes),
    rotasDistintas: num(i?.rotas_distintas),
    coloaders: num(i?.coloaders),
    conversaoRecorte,
    mediaGeral,
    diferenca: conversaoRecorte - mediaGeral,
    decisoes,
  };

  const clientesAll = ranking(agregado.clientes);
  const rotasAll = ranking(agregado.rotas);
  const coloadersAll = ranking(agregado.coloaders);
  const agentesAll = ranking(agregado.agentes);

  const totalReprovacoes = num(agregado.motivosTotal);
  const motivos: LinhaMotivo[] = (agregado.motivos ?? []).map((m) => ({
    motivo: m.motivo,
    reprovadas: num(m.reprovadas),
    participacao: totalReprovacoes > 0 ? num(m.reprovadas) / totalReprovacoes : 0,
  }));

  const rotaAgente: LinhaRotaAgente[] = (agregado.rotaAgente ?? []).map((c) => ({
    rota: c.rota,
    agente: c.agente,
    rotas: num(c.rotas),
    aprovadas: num(c.aprovadas),
    reprovadas: num(c.reprovadas),
    emAnalise: num(c.em_analise),
    conversao: conversao(num(c.aprovadas), num(c.reprovadas)),
  }));

  const perfil = montarPerfil(clientesAll, rotasAll, coloadersAll, agentesAll);

  return {
    analista,
    indicadores,
    perfil,
    insightsPricing: montarInsightsPricing(indicadores, perfil),
    ondeAtuar: montarOndeAtuar(indicadores, perfil, motivos),
    clientes: clientesAll.slice(0, TOP_N),
    rotas: rotasAll.slice(0, TOP_N),
    coloaders: coloadersAll.slice(0, TOP_N),
    motivos: motivos.slice(0, TOP_N),
    rotaAgente: rotaAgente.slice(0, TOP_N),
  };
}
