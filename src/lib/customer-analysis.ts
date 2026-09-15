// ============================================================================
// Calculadora pura da ficha "Clientes → Por cliente".
//
// Recebe as linhas já filtradas (um registro por revisão de oferta do cliente
// selecionado, com Inclui_Filtro = 1) e a média geral do produto, e reproduz
// os indicadores, o perfil, os insights e os rankings da aba CLIENTES da
// planilha "ANALISE COTAÇÕES".
//
// É agnóstica de framework: não importa Supabase nem TanStack, apenas recebe
// dados e devolve o objeto de análise. Assim o mesmo cálculo pode rodar no
// servidor (server function) ou em testes.
// ============================================================================

/** Uma revisão de oferta normalizada (linha de v_ofertas_analitico). */
export type HistRow = {
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

/** Bloco 1 — Indicadores do recorte. */
export type Indicadores = {
  /** Linhas do recorte (uma por revisão). */
  rotas: number;
  /** Ofertas distintas. */
  ofertas: number;
  aprovadas: number;
  reprovadas: number;
  emAnalise: number;
  /** Aprovadas / (Aprovadas + Reprovadas). */
  taxaAprovacao: number;
  /** Reprovadas / (Aprovadas + Reprovadas). */
  taxaReprovacao: number;
  /** Clientes distintos (sempre 1 no recorte por cliente). */
  clientes: number;
  /** Rotas (Origem → Destino) distintas. */
  rotasDistintas: number;
  /** Coloaders distintos. */
  coloaders: number;
  /** Conversão do recorte = taxa de aprovação. */
  conversaoRecorte: number;
  /** Conversão da base inteira do produto. */
  mediaGeral: number;
  /** Recorte − média (em pontos de conversão, 0..1). */
  diferenca: number;
  /** Aprovadas + reprovadas. */
  decisoes: number;
};

/** Bloco 2 — Perfil do recorte (textos prontos). */
export type Perfil = {
  maisRecorrente: string;
  maisAprovacoes: string;
  maisReprovacoes: string;
  melhorConversao: string;
  piorConversao: string;
  principalMotivo: string;
};

/** Linha de um ranking por dimensão (rota, coloader ou agente). */
export type LinhaRanking = {
  item: string;
  /** Linhas (revisões) da dimensão. */
  rotas: number;
  aprovadas: number;
  reprovadas: number;
  emAnalise: number;
  conversao: number;
};

/** Linha do bloco de motivos de reprovação. */
export type LinhaMotivo = {
  motivo: string;
  reprovadas: number;
  /** Participação sobre o total de reprovações do cliente. */
  participacao: number;
};

/** Linha do cruzamento Rota × Coloader. */
export type LinhaRotaColoader = {
  rota: string;
  coloader: string;
  rotas: number;
  aprovadas: number;
  reprovadas: number;
  emAnalise: number;
  conversao: number;
};

/** Objeto completo consumido pela tela. */
export type AnaliseCliente = {
  cliente: string;
  indicadores: Indicadores;
  perfil: Perfil;
  insightsPricing: string[];
  ondeAtuar: string[];
  rotas: LinhaRanking[];
  coloaders: LinhaRanking[];
  agentes: LinhaRanking[];
  motivos: LinhaMotivo[];
  rotaColoader: LinhaRotaColoader[];
};

// ---------------------------------------------------------------------------
// Helpers de formatação e cálculo
// ---------------------------------------------------------------------------

/** Formata um número 0..1 como percentual pt-BR com uma casa (ex.: 52,3%). */
export function formatarPct(valor: number): string {
  if (!Number.isFinite(valor)) return "—";
  return `${(valor * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function inteiroBR(valor: number): string {
  return valor.toLocaleString("pt-BR");
}

/** Conversão = Aprovadas / (Aprovadas + Reprovadas). Zero quando não há decisão. */
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

// ---------------------------------------------------------------------------
// Agregações
// ---------------------------------------------------------------------------

type AccRanking = {
  item: string;
  rotas: number;
  aprovadas: number;
  reprovadas: number;
  emAnalise: number;
  /** Ordem de primeira aparição — desempate estável, como no Excel. */
  ordem: number;
};

/**
 * Agrupa as linhas por uma dimensão e ordena por volume (linhas) desc, com
 * desempate pela ordem de primeira aparição (equivale ao SORTBY estável).
 */
function agregarPor(rows: HistRow[], chave: (r: HistRow) => string): LinhaRanking[] {
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

/** Cruzamento Rota × Coloader, ordenado por reprovações desc (desempate por volume). */
function agregarRotaColoader(rows: HistRow[]): LinhaRotaColoader[] {
  type Acc = AccRanking & { rota: string; coloader: string };
  const mapa = new Map<string, Acc>();
  let ordem = 0;

  for (const r of rows) {
    const rota = texto(r.rota_analitica, "(Rota incompleta)");
    const coloader = texto(r.coloader_analitico);
    const k = `${rota}||${coloader}`;
    let acc = mapa.get(k);
    if (!acc) {
      acc = {
        item: k,
        rota,
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
      rota: a.rota,
      coloader: a.coloader,
      rotas: a.rotas,
      aprovadas: a.aprovadas,
      reprovadas: a.reprovadas,
      emAnalise: a.emAnalise,
      conversao: conversao(a.aprovadas, a.reprovadas),
    }));
}

/** Motivos de reprovação, considerando apenas linhas reprovadas. */
function agregarMotivos(rows: HistRow[]): LinhaMotivo[] {
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

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

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

/**
 * Mínimo de decisões para um agrupamento ser considerado relevante em
 * "Melhor conversão" / "Pior conversão" — equivale a TRATAMENTO!B5 da planilha.
 */
export const MIN_DECISOES = 5;

const semAmostra = `Amostra pequena — sem combinação com ${MIN_DECISOES} decisões`;

function montarPerfil(rotas: LinhaRanking[], motivos: LinhaMotivo[]): Perfil {
  const semDados = "—";
  const recorrente = rotas[0]; // já ordenado por volume desc (desempate estável)
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

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

function pontos(diferenca: number): string {
  const sinal = diferenca > 0 ? "+" : "";
  return `${sinal}${(diferenca * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} p.p.`;
}

function montarInsightsPricing(
  ind: Indicadores,
  rotas: LinhaRanking[],
  perfil: Perfil,
  motivos: LinhaMotivo[],
): string[] {
  const itens: string[] = [];

  // 1 — principal agrupamento.
  const recorrente = rotas[0];
  if (recorrente && ind.rotas > 0) {
    itens.push(
      `O principal agrupamento é ${recorrente.item}, com ${formatarPct(
        recorrente.rotas / ind.rotas,
      )} das rotas.`,
    );
  }

  // 2 — conversão vs. média geral.
  itens.push(
    `Conversão de ${formatarPct(ind.conversaoRecorte)} vs. ${formatarPct(
      ind.mediaGeral,
    )} na base (${pontos(ind.diferenca)}; ${inteiroBR(ind.decisoes)} decisões).`,
  );

  // 3 — principal motivo.
  itens.push(
    `Principal motivo registrado nas reprovações: ${
      motivos[0] ? motivos[0].motivo : "—"
    }.`,
  );

  // 4 — melhor / pior agrupamento relevante.
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
  rotaColoader: LinhaRotaColoader[],
): string[] {
  const itens: string[] = [];

  // 1 — prioridade geral.
  if (ind.decisoes < MIN_DECISOES) {
    itens.push(`AMOSTRA PEQUENA — ${inteiroBR(ind.rotas)} rotas.`);
  } else if (ind.diferenca < 0) {
    itens.push(
      `ALTA PRIORIDADE — conversão ${pontos(Math.abs(ind.diferenca))} abaixo da média.`,
    );
  } else {
    itens.push("PONTO FORTE — conversão igual ou acima da média.");
  }

  // Combinação relevante = a primeira do ranking (mais reprovações).
  const critico = rotaColoader[0];
  const combinacao = critico ? `${critico.rota} × ${critico.coloader}` : null;

  // 2 — reprovações da combinação.
  if (critico && combinacao) {
    itens.push(
      `ATENÇÃO — ${combinacao} reúne ${inteiroBR(critico.reprovadas)} reprovações.`,
    );
  } else {
    itens.push("Sem combinação disponível");
  }

  // 3 — concentração de rotas.
  if (critico && combinacao && ind.rotas > 0) {
    itens.push(
      `DEPENDÊNCIA — ${combinacao} concentra ${formatarPct(
        critico.rotas / ind.rotas,
      )} das rotas.`,
    );
  } else {
    itens.push("Sem concentração calculável");
  }

  // 4 — conversão da combinação vs. média geral.
  if (critico && combinacao && critico.aprovadas + critico.reprovadas > 0) {
    const rotulo = critico.conversao >= ind.mediaGeral ? "PONTO FORTE" : "INVESTIGAR";
    itens.push(`${rotulo} — ${combinacao} converte ${formatarPct(critico.conversao)}.`);
  } else {
    itens.push("Sem amostra");
  }

  return itens;
}

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

export function analisarCliente(params: {
  cliente: string;
  rows: HistRow[];
  mediaAprovadas: number;
  mediaReprovadas: number;
}): AnaliseCliente {
  const { cliente, rows, mediaAprovadas, mediaReprovadas } = params;

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

  const rotas = agregarPor(rows, (r) => texto(r.rota_analitica, "(Rota incompleta)"));
  const coloaders = agregarPor(rows, (r) => texto(r.coloader_analitico));
  const agentes = agregarPor(rows, (r) => texto(r.agente_analitico));
  const motivos = agregarMotivos(rows);
  const rotaColoader = agregarRotaColoader(rows);

  const perfil = montarPerfil(rotas, motivos);
  const insightsPricing = montarInsightsPricing(indicadores, rotas, perfil, motivos);
  const ondeAtuar = montarOndeAtuar(indicadores, rotaColoader);

  return {
    cliente,
    indicadores,
    perfil,
    insightsPricing,
    ondeAtuar,
    rotas,
    coloaders,
    agentes,
    motivos,
    rotaColoader,
  };
}
