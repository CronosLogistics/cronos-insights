// ============================================================================
// Calculadora pura da ficha "Agentes".
//
// Recebe agregações já filtradas (Inclui_Filtro / produto via RLS + filtro de
// agente) e a média geral do produto, e reproduz a aba AGENTES da planilha
// "ANALISE COTAÇÕES".
// ============================================================================

import {
  formatarDiferenca,
  formatarPct,
  MIN_DECISOES,
  type Indicadores,
  type LinhaMotivo,
  type LinhaRanking,
  type LinhaRotaColoader,
  type Perfil,
} from "@/lib/customer-analysis";

export { formatarDiferenca, formatarPct, MIN_DECISOES };
export type { Indicadores, LinhaMotivo, LinhaRanking, LinhaRotaColoader, Perfil };

export const FILTRO_TODOS = "Todos";

/** Agente normalizado vazio → "(Não informado)" (ARRUMAR + vazio da planilha). */
export const AGENTE_NAO_INFORMADO = "(Não informado)";

/** Objeto completo consumido pela tela. */
export type AnaliseAgentes = {
  agente: string;
  indicadores: Indicadores;
  perfil: Perfil;
  insightsPricing: string[];
  ondeAtuar: string[];
  rotas: LinhaRanking[];
  coloaders: LinhaRanking[];
  clientes: LinhaRanking[];
  motivos: LinhaMotivo[];
  rotaColoader: LinhaRotaColoader[];
};

const TOP_N = 10;

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
 * Equivale a ARRUMAR(Agente) da planilha: trim + vazio → "(Não informado)".
 */
export function normalizarAgente(valor: string | null | undefined): string {
  const t = (valor ?? "").trim().replace(/\s+/g, " ");
  return t === "" ? AGENTE_NAO_INFORMADO : t;
}

type LinhaAgregada = {
  item: string;
  rotas: number;
  aprovadas: number;
  reprovadas: number;
  em_analise: number;
};

export type AgregadoAgentes = {
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
  rotas: LinhaAgregada[];
  coloaders: LinhaAgregada[];
  clientes: LinhaAgregada[];
  motivosTotal: number;
  motivos: { motivo: string; reprovadas: number }[];
  rotaColoader: {
    rota: string;
    coloader: string;
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

/** Comportamento do agente analisa Rota_Analitica. */
function montarPerfil(rotas: LinhaRanking[], motivos: LinhaMotivo[]): Perfil {
  const semDados = "—";
  const recorrente = rotas[0];
  const relevante = (l: LinhaRanking) => l.aprovadas + l.reprovadas >= MIN_DECISOES;
  const melhor = maxPor(rotas, (l) => l.conversao, relevante);
  const pior = minPor(rotas, (l) => l.conversao, relevante);
  const maisAp = maxPor(rotas, (l) => l.aprovadas);
  const maisRep = maxPor(rotas, (l) => l.reprovadas);
  const principalMotivo = motivos[0]
    ? `${motivos[0].motivo} — ${inteiroBR(motivos[0].reprovadas)} reprovações`
    : semDados;

  return {
    maisRecorrente: recorrente
      ? `${recorrente.item} — ${inteiroBR(recorrente.rotas)} linhas`
      : semDados,
    maisAprovacoes: maisAp ? `${maisAp.item} — ${inteiroBR(maisAp.aprovadas)} aprovadas` : semDados,
    maisReprovacoes: maisRep
      ? `${maisRep.item} — ${inteiroBR(maisRep.reprovadas)} reprovadas`
      : semDados,
    melhorConversao: melhor ? `${melhor.item} — ${formatarPct(melhor.conversao)}` : semAmostra,
    piorConversao: pior ? `${pior.item} — ${formatarPct(pior.conversao)}` : semAmostra,
    principalMotivo,
  };
}

function pontos(diferenca: number): string {
  return formatarDiferenca(diferenca);
}

function montarInsightsPricing(
  ind: Indicadores,
  rotas: LinhaRanking[],
  motivos: LinhaMotivo[],
): string[] {
  const itens: string[] = [];
  const recorrente = rotas[0];

  if (recorrente && ind.rotas > 0) {
    itens.push(
      `O principal agrupamento é ${recorrente.item}, com ${formatarPct(
        recorrente.rotas / ind.rotas,
      )} das rotas.`,
    );
  } else {
    itens.push("O principal agrupamento é —, com 0,0% das rotas.");
  }

  itens.push(
    `Conversão de ${formatarPct(ind.conversaoRecorte)} vs. ${formatarPct(
      ind.mediaGeral,
    )} na base (${pontos(ind.diferenca)}; ${inteiroBR(ind.decisoes)} decisões).`,
  );

  itens.push(
    `Principal motivo registrado nas reprovações: ${
      motivos[0] ? motivos[0].motivo : "—"
    }.`,
  );

  if (ind.decisoes < MIN_DECISOES) {
    itens.push(`Amostra pequena — ${inteiroBR(ind.rotas)} rotas.`);
  } else {
    const relevante = (l: LinhaRanking) => l.aprovadas + l.reprovadas >= MIN_DECISOES;
    const nomeMelhor = maxPor(rotas, (l) => l.conversao, relevante);
    const nomePior = minPor(rotas, (l) => l.conversao, relevante);
    if (nomeMelhor && nomePior) {
      itens.push(
        `Melhor agrupamento relevante: ${nomeMelhor.item}; pior: ${nomePior.item}.`,
      );
    } else {
      itens.push(
        `Melhor agrupamento relevante: ${semAmostra}; pior: ${semAmostra}.`,
      );
    }
  }

  return itens;
}

/**
 * Onde atuar — aba AGENTES (fórmulas A21–A24):
 * - prioridade pelo recorte;
 * - atenção / ponto forte pela 1ª rota (A28/D28/F28);
 * - dependência pelo 1º coloader (J28/K28).
 */
function montarOndeAtuar(
  ind: Indicadores,
  rotas: LinhaRanking[],
  coloaders: LinhaRanking[],
): string[] {
  const itens: string[] = [];

  if (ind.decisoes < MIN_DECISOES) {
    itens.push(`AMOSTRA PEQUENA — ${inteiroBR(ind.rotas)} rotas.`);
  } else if (ind.diferenca < 0) {
    itens.push(
      `ALTA PRIORIDADE — conversão ${pontos(Math.abs(ind.diferenca))} abaixo da média.`,
    );
  } else {
    itens.push("PONTO FORTE — conversão igual ou acima da média.");
  }

  const topRota = rotas[0];
  const topColoader = coloaders[0];

  if (topRota) {
    itens.push(
      `ATENÇÃO — ${topRota.item} reúne ${inteiroBR(topRota.reprovadas)} reprovações.`,
    );
  } else {
    itens.push("Sem combinação disponível");
  }

  if (topColoader && ind.rotas > 0) {
    itens.push(
      `DEPENDÊNCIA — ${topColoader.item} concentra ${formatarPct(
        topColoader.rotas / ind.rotas,
      )} das rotas.`,
    );
  } else {
    itens.push("Sem concentração calculável");
  }

  if (topRota) {
    const rotulo = topRota.conversao >= ind.mediaGeral ? "PONTO FORTE" : "INVESTIGAR";
    itens.push(`${rotulo} — ${topRota.item} converte ${formatarPct(topRota.conversao)}.`);
  } else {
    itens.push("Sem amostra");
  }

  return itens;
}

export function montarAnaliseAgentes(
  agente: string,
  agregado: AgregadoAgentes,
): AnaliseAgentes {
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

  const rotasAll = ranking(agregado.rotas);
  const coloaders = ranking(agregado.coloaders);
  const clientes = ranking(agregado.clientes);

  const totalReprovacoes = num(agregado.motivosTotal);
  const motivos: LinhaMotivo[] = (agregado.motivos ?? []).map((m) => ({
    motivo: m.motivo,
    reprovadas: num(m.reprovadas),
    participacao: totalReprovacoes > 0 ? num(m.reprovadas) / totalReprovacoes : 0,
  }));

  const rotaColoader: LinhaRotaColoader[] = (agregado.rotaColoader ?? []).map((c) => ({
    rota: c.rota,
    coloader: c.coloader,
    rotas: num(c.rotas),
    aprovadas: num(c.aprovadas),
    reprovadas: num(c.reprovadas),
    emAnalise: num(c.em_analise),
    conversao: conversao(num(c.aprovadas), num(c.reprovadas)),
  }));

  const perfil = montarPerfil(rotasAll, motivos);

  return {
    agente,
    indicadores,
    perfil,
    insightsPricing: montarInsightsPricing(indicadores, rotasAll, motivos),
    ondeAtuar: montarOndeAtuar(indicadores, rotasAll, coloaders),
    rotas: rotasAll.slice(0, TOP_N),
    coloaders: coloaders.slice(0, TOP_N),
    clientes: clientes.slice(0, TOP_N),
    motivos: motivos.slice(0, TOP_N),
    rotaColoader: rotaColoader.slice(0, TOP_N),
  };
}
