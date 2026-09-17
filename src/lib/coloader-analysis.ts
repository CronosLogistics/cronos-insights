// ============================================================================
// Calculadora pura da ficha "Coloaders / Armadores".
//
// Recebe agregações já filtradas (Inclui_Filtro / produto via RLS + filtro de
// coloader) e a média geral do produto, e reproduz a aba COLOADER da planilha
// "ANALISE COTAÇÕES".
// ============================================================================

import {
  formatarDiferenca,
  formatarPct,
  MIN_DECISOES,
  type Indicadores,
  type LinhaMotivo,
  type LinhaRanking,
  type Perfil,
} from "@/lib/customer-analysis";

export { formatarDiferenca, formatarPct, MIN_DECISOES };
export type { Indicadores, LinhaMotivo, LinhaRanking, Perfil };

export const FILTRO_TODOS = "Todos";

/** Coloader normalizado vazio → "(Não informado)". */
export const COLOADER_NAO_INFORMADO = "(Não informado)";

/** Linha do cruzamento Rota × Cliente (oportunidades da aba COLOADER). */
export type LinhaRotaCliente = {
  rota: string;
  cliente: string;
  rotas: number;
  aprovadas: number;
  reprovadas: number;
  emAnalise: number;
  conversao: number;
};

/** Objeto completo consumido pela tela. */
export type AnaliseColoaders = {
  coloader: string;
  indicadores: Indicadores;
  perfil: Perfil;
  insightsPricing: string[];
  ondeAtuar: string[];
  rotas: LinhaRanking[];
  clientes: LinhaRanking[];
  agentes: LinhaRanking[];
  motivos: LinhaMotivo[];
  rotaCliente: LinhaRotaCliente[];
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
 * Equivale a ARRUMAR/trim do Coloader_Analitico da planilha.
 */
export function normalizarColoader(valor: string | null | undefined): string {
  const t = (valor ?? "").trim();
  return t === "" ? COLOADER_NAO_INFORMADO : t;
}

type LinhaAgregada = {
  item: string;
  rotas: number;
  aprovadas: number;
  reprovadas: number;
  em_analise: number;
};

export type AgregadoColoaders = {
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
  clientes: LinhaAgregada[];
  agentes: LinhaAgregada[];
  motivosTotal: number;
  motivos: { motivo: string; reprovadas: number }[];
  rotaCliente: {
    rota: string;
    cliente: string;
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

/** Perfil do recorte analisa Rota_Analitica do coloader. */
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
 * Onde atuar — aba COLOADER:
 * - prioridade pelo recorte;
 * - atenção / ponto forte pela 1ª rota (Rotas do Coloader);
 * - dependência pelo 1º cliente (Clientes do Coloader).
 */
function montarOndeAtuar(
  ind: Indicadores,
  rotas: LinhaRanking[],
  clientes: LinhaRanking[],
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
  const topCliente = clientes[0];

  if (topRota) {
    itens.push(
      `ATENÇÃO — ${topRota.item} reúne ${inteiroBR(topRota.reprovadas)} reprovações.`,
    );
  } else {
    itens.push("Sem combinação disponível");
  }

  if (topCliente && ind.rotas > 0) {
    itens.push(
      `DEPENDÊNCIA — ${topCliente.item} concentra ${formatarPct(
        topCliente.rotas / ind.rotas,
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

export function montarAnaliseColoaders(
  coloader: string,
  agregado: AgregadoColoaders,
): AnaliseColoaders {
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
  const clientes = ranking(agregado.clientes);
  const agentes = ranking(agregado.agentes);

  const totalReprovacoes = num(agregado.motivosTotal);
  const motivos: LinhaMotivo[] = (agregado.motivos ?? []).map((m) => ({
    motivo: m.motivo,
    reprovadas: num(m.reprovadas),
    participacao: totalReprovacoes > 0 ? num(m.reprovadas) / totalReprovacoes : 0,
  }));

  const rotaCliente: LinhaRotaCliente[] = (agregado.rotaCliente ?? []).map((c) => ({
    rota: c.rota,
    cliente: c.cliente,
    rotas: num(c.rotas),
    aprovadas: num(c.aprovadas),
    reprovadas: num(c.reprovadas),
    emAnalise: num(c.em_analise),
    conversao: conversao(num(c.aprovadas), num(c.reprovadas)),
  }));

  const perfil = montarPerfil(rotasAll, motivos);

  return {
    coloader,
    indicadores,
    perfil,
    insightsPricing: montarInsightsPricing(indicadores, rotasAll, motivos),
    ondeAtuar: montarOndeAtuar(indicadores, rotasAll, clientes),
    rotas: rotasAll.slice(0, TOP_N),
    clientes: clientes.slice(0, TOP_N),
    agentes: agentes.slice(0, TOP_N),
    motivos: motivos.slice(0, TOP_N),
    rotaCliente: rotaCliente.slice(0, TOP_N),
  };
}
