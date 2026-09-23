// ============================================================================
// Calculadora pura da ficha "Rotas".
//
// Recebe as linhas já filtradas (Inclui_Filtro = 1 + filtros de origem/destino/rota
// + produto via RLS) e a média geral do produto, e reproduz a aba ROTAS da
// planilha "ANALISE COTAÇÕES".
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

/** Uma revisão de oferta no recorte de rotas (linha de v_ofertas_analitico). */
export type RouteHistRow = {
  oferta: string | null;
  cliente_analitico: string | null;
  rota_analitica: string | null;
  coloader_analitico: string | null;
  agente_analitico: string | null;
  motivo_perda_analitico: string | null;
  flag_aprovada: number | null;
  flag_reprovada: number | null;
  flag_em_analise: number | null;
};

/** Cruzamento Cliente × Coloader. */
export type LinhaClienteColoader = {
  cliente: string;
  coloader: string;
  rotas: number;
  aprovadas: number;
  reprovadas: number;
  emAnalise: number;
  conversao: number;
};

/** Filtros locais da tela (além do Produto do usuário). */
export type FiltrosRotas = {
  paisOrigem: string;
  portoOrigem: string;
  paisDestino: string;
  portoDestino: string;
  rota: string;
  dataInicial: string | null;
  dataFinal: string | null;
};

export const FILTRO_TODOS = "Todos";

/** Equivale a Rota_Analitica incompleta na planilha (origem ou destino vazio). */
export const ROTA_INCOMPLETA = "(Rota incompleta)";

/** Objeto completo consumido pela tela. */
export type AnaliseRotas = {
  filtros: FiltrosRotas;
  indicadores: Indicadores;
  perfil: Perfil;
  insightsPricing: string[];
  ondeAtuar: string[];
  coloaders: LinhaRanking[];
  clientes: LinhaRanking[];
  agentes: LinhaRanking[];
  motivos: LinhaMotivo[];
  clienteColoader: LinhaClienteColoader[];
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

function texto(valor: string | null | undefined, fallback = "(Não informado)"): string {
  const t = (valor ?? "").trim();
  return t === "" ? fallback : t;
}

type AccRanking = {
  item: string;
  rotas: number;
  aprovadas: number;
  reprovadas: number;
  emAnalise: number;
  ordem: number;
};

function agregarPor(rows: RouteHistRow[], chave: (r: RouteHistRow) => string): LinhaRanking[] {
  const mapa = new Map<string, AccRanking>();
  let ordem = 0;

  for (const r of rows) {
    const k = chave(r);
    let acc = mapa.get(k);
    if (!acc) {
      acc = { item: k, rotas: 0, aprovadas: 0, reprovadas: 0, emAnalise: 0, ordem: ordem++ };
      mapa.set(k, acc);
    }
    acc.rotas += 1;
    acc.aprovadas += num(r.flag_aprovada);
    acc.reprovadas += num(r.flag_reprovada);
    acc.emAnalise += num(r.flag_em_analise);
  }

  return Array.from(mapa.values())
    .sort((a, b) => b.rotas - a.rotas || a.ordem - b.ordem)
    .map((a) => ({
      item: a.item,
      rotas: a.rotas,
      aprovadas: a.aprovadas,
      reprovadas: a.reprovadas,
      emAnalise: a.emAnalise,
      conversao: conversao(a.aprovadas, a.reprovadas),
    }));
}

function agregarClienteColoader(rows: RouteHistRow[]): LinhaClienteColoader[] {
  type Acc = AccRanking & { cliente: string; coloader: string };
  const mapa = new Map<string, Acc>();
  let ordem = 0;

  for (const r of rows) {
    const cliente = texto(r.cliente_analitico);
    const coloader = texto(r.coloader_analitico);
    const k = `${cliente}||${coloader}`;
    let acc = mapa.get(k);
    if (!acc) {
      acc = {
        item: k,
        cliente,
        coloader,
        rotas: 0,
        aprovadas: 0,
        reprovadas: 0,
        emAnalise: 0,
        ordem: ordem++,
      };
      mapa.set(k, acc);
    }
    acc.rotas += 1;
    acc.aprovadas += num(r.flag_aprovada);
    acc.reprovadas += num(r.flag_reprovada);
    acc.emAnalise += num(r.flag_em_analise);
  }

  return Array.from(mapa.values())
    .sort((a, b) => b.reprovadas - a.reprovadas || b.rotas - a.rotas || a.ordem - b.ordem)
    .map((a) => ({
      cliente: a.cliente,
      coloader: a.coloader,
      rotas: a.rotas,
      aprovadas: a.aprovadas,
      reprovadas: a.reprovadas,
      emAnalise: a.emAnalise,
      conversao: conversao(a.aprovadas, a.reprovadas),
    }));
}

function agregarMotivos(rows: RouteHistRow[]): LinhaMotivo[] {
  const mapa = new Map<string, { motivo: string; reprovadas: number; ordem: number }>();
  let ordem = 0;
  let total = 0;

  for (const r of rows) {
    if (num(r.flag_reprovada) !== 1) continue;
    total += 1;
    const motivo = texto(r.motivo_perda_analitico);
    let acc = mapa.get(motivo);
    if (!acc) {
      acc = { motivo, reprovadas: 0, ordem: ordem++ };
      mapa.set(motivo, acc);
    }
    acc.reprovadas += 1;
  }

  return Array.from(mapa.values())
    .sort((a, b) => b.reprovadas - a.reprovadas || a.ordem - b.ordem)
    .map((a) => ({
      motivo: a.motivo,
      reprovadas: a.reprovadas,
      participacao: total > 0 ? a.reprovadas / total : 0,
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

/** Perfil do recorte analisa Coloader_Analitico (não rota). */
function montarPerfil(coloaders: LinhaRanking[], motivos: LinhaMotivo[]): Perfil {
  const semDados = "—";
  const recorrente = coloaders[0];
  const relevante = (l: LinhaRanking) => l.aprovadas + l.reprovadas >= MIN_DECISOES;
  const melhor = maxPor(coloaders, (l) => l.conversao, relevante);
  const pior = minPor(coloaders, (l) => l.conversao, relevante);
  const maisAp = maxPor(coloaders, (l) => l.aprovadas);
  const maisRep = maxPor(coloaders, (l) => l.reprovadas);
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
  coloaders: LinhaRanking[],
  perfil: Perfil,
  motivos: LinhaMotivo[],
): string[] {
  const itens: string[] = [];
  const recorrente = coloaders[0];

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
    itens.push(
      `Melhor agrupamento relevante: ${perfil.melhorConversao}; pior: ${perfil.piorConversao}.`,
    );
  }

  return itens;
}

function montarOndeAtuar(
  ind: Indicadores,
  coloaders: LinhaRanking[],
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

  const topColoader = coloaders[0];
  const topCliente = clientes[0];

  if (topColoader) {
    itens.push(
      `ATENÇÃO — ${topColoader.item} reúne ${inteiroBR(topColoader.reprovadas)} reprovações.`,
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

  if (topColoader) {
    const rotulo = topColoader.conversao >= ind.mediaGeral ? "PONTO FORTE" : "INVESTIGAR";
    itens.push(`${rotulo} — ${topColoader.item} converte ${formatarPct(topColoader.conversao)}.`);
  } else {
    itens.push("Sem amostra");
  }

  return itens;
}

// ---------------------------------------------------------------------------
// Caminho usado pela tela: agregações vindas do banco (public.rotas_analise).
// ---------------------------------------------------------------------------

type LinhaAgregada = {
  item: string;
  rotas: number;
  aprovadas: number;
  reprovadas: number;
  em_analise: number;
};

export type AgregadoRotas = {
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
  coloaders: LinhaAgregada[];
  clientes: LinhaAgregada[];
  agentes: LinhaAgregada[];
  motivosTotal: number;
  motivos: { motivo: string; reprovadas: number }[];
  clienteColoader: {
    cliente: string;
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

export function montarAnaliseRotas(
  filtros: FiltrosRotas,
  agregado: AgregadoRotas,
): AnaliseRotas {
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

  const coloaders = ranking(agregado.coloaders);
  const clientes = ranking(agregado.clientes);
  const agentes = ranking(agregado.agentes);

  const totalReprovacoes = num(agregado.motivosTotal);
  const motivos: LinhaMotivo[] = (agregado.motivos ?? []).map((m) => ({
    motivo: m.motivo,
    reprovadas: num(m.reprovadas),
    participacao: totalReprovacoes > 0 ? num(m.reprovadas) / totalReprovacoes : 0,
  }));

  const clienteColoader: LinhaClienteColoader[] = (agregado.clienteColoader ?? []).map((c) => ({
    cliente: c.cliente,
    coloader: c.coloader,
    rotas: num(c.rotas),
    aprovadas: num(c.aprovadas),
    reprovadas: num(c.reprovadas),
    emAnalise: num(c.em_analise),
    conversao: conversao(num(c.aprovadas), num(c.reprovadas)),
  }));

  const perfil = montarPerfil(coloaders, motivos);

  return {
    filtros,
    indicadores,
    perfil,
    insightsPricing: montarInsightsPricing(indicadores, coloaders, perfil, motivos),
    ondeAtuar: montarOndeAtuar(indicadores, coloaders, clientes),
    coloaders: coloaders.slice(0, TOP_N),
    clientes: clientes.slice(0, TOP_N),
    agentes: agentes.slice(0, TOP_N),
    motivos: motivos.slice(0, TOP_N),
    clienteColoader: clienteColoader.slice(0, TOP_N),
  };
}

export function analisarRotas(params: {
  filtros: FiltrosRotas;
  rows: RouteHistRow[];
  mediaAprovadas: number;
  mediaReprovadas: number;
}): AnaliseRotas {
  const { filtros, rows, mediaAprovadas, mediaReprovadas } = params;

  const aprovadas = rows.reduce((s, r) => s + num(r.flag_aprovada), 0);
  const reprovadas = rows.reduce((s, r) => s + num(r.flag_reprovada), 0);
  const emAnalise = rows.reduce((s, r) => s + num(r.flag_em_analise), 0);
  const decisoes = aprovadas + reprovadas;

  const ofertasDistintas = new Set(
    rows.map((r) => (r.oferta ?? "").trim()).filter((o) => o !== ""),
  ).size;
  const clientesDistintos = new Set(rows.map((r) => texto(r.cliente_analitico))).size;
  const rotasDistintas = new Set(
    rows.map((r) => texto(r.rota_analitica, "(Rota incompleta)")),
  ).size;
  const coloadersDistintos = new Set(rows.map((r) => texto(r.coloader_analitico))).size;

  const conversaoRecorte = conversao(aprovadas, reprovadas);
  const mediaGeral = conversao(mediaAprovadas, mediaReprovadas);

  const indicadores: Indicadores = {
    rotas: rows.length,
    ofertas: ofertasDistintas,
    aprovadas,
    reprovadas,
    emAnalise,
    taxaAprovacao: conversaoRecorte,
    taxaReprovacao: decisoes > 0 ? reprovadas / decisoes : 0,
    clientes: clientesDistintos,
    rotasDistintas,
    coloaders: coloadersDistintos,
    conversaoRecorte,
    mediaGeral,
    diferenca: conversaoRecorte - mediaGeral,
    decisoes,
  };

  const coloadersAll = agregarPor(rows, (r) => texto(r.coloader_analitico));
  const clientesAll = agregarPor(rows, (r) => texto(r.cliente_analitico));
  const agentesAll = agregarPor(rows, (r) => texto(r.agente_analitico));
  const motivosAll = agregarMotivos(rows);
  const clienteColoaderAll = agregarClienteColoader(rows);

  const perfil = montarPerfil(coloadersAll, motivosAll);
  const insightsPricing = montarInsightsPricing(indicadores, coloadersAll, perfil, motivosAll);
  const ondeAtuar = montarOndeAtuar(indicadores, coloadersAll, clientesAll);

  return {
    filtros,
    indicadores,
    perfil,
    insightsPricing,
    ondeAtuar,
    coloaders: coloadersAll.slice(0, TOP_N),
    clientes: clientesAll.slice(0, TOP_N),
    agentes: agentesAll.slice(0, TOP_N),
    motivos: motivosAll.slice(0, TOP_N),
    clienteColoader: clienteColoaderAll.slice(0, TOP_N),
  };
}
