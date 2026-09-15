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

function montarPerfil(rotas: LinhaRanking[], motivos: LinhaMotivo[]): Perfil {
  const semDados = "—";
  // rotas já vem ordenado por volume desc (desempate estável).
  const recorrente = rotas[0];
  if (!recorrente) {
    return {
      maisRecorrente: semDados,
      maisAprovacoes: semDados,
      maisReprovacoes: semDados,
      melhorConversao: semDados,
      piorConversao: semDados,
      principalMotivo: motivos[0]
        ? `${motivos[0].motivo} — ${inteiroBR(motivos[0].reprovadas)} reprovações`
        : semDados,
    };
  }

  const maisAp = maxPor(rotas, (l) => l.aprovadas);
  const maisRep = maxPor(rotas, (l) => l.reprovadas);
  const comDecisao = (l: LinhaRanking) => l.aprovadas + l.reprovadas > 0;
  const melhor = maxPor(rotas, (l) => l.conversao, comDecisao);
  const pior = minPor(rotas, (l) => l.conversao, comDecisao);

  return {
    maisRecorrente: `${recorrente.item} — ${inteiroBR(recorrente.rotas)} linhas`,
    maisAprovacoes: maisAp
      ? `${maisAp.item} — ${inteiroBR(maisAp.aprovadas)} aprovadas`
      : semDados,
    maisReprovacoes: maisRep
      ? `${maisRep.item} — ${inteiroBR(maisRep.reprovadas)} reprovadas`
      : semDados,
    melhorConversao: melhor
      ? `${melhor.item} — ${formatarPct(melhor.conversao)}`
      : semDados,
    piorConversao: pior ? `${pior.item} — ${formatarPct(pior.conversao)}` : semDados,
    principalMotivo: motivos[0]
      ? `${motivos[0].motivo} — ${inteiroBR(motivos[0].reprovadas)} reprovações`
      : semDados,
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

function montarInsightsPricing(ind: Indicadores, motivos: LinhaMotivo[]): string[] {
  const itens: string[] = [];

  if (ind.decisoes === 0) {
    itens.push(
      "O cliente ainda não possui decisões (aprovações ou reprovações) no recorte atual.",
    );
    if (ind.emAnalise > 0) {
      itens.push(
        `Há ${inteiroBR(ind.emAnalise)} oferta(s) em análise aguardando desfecho.`,
      );
    }
    return itens;
  }

  if (ind.diferenca > 0.0001) {
    itens.push(
      `A conversão do cliente (${formatarPct(ind.conversaoRecorte)}) está ${pontos(
        ind.diferenca,
      )} acima da média do produto (${formatarPct(ind.mediaGeral)}).`,
    );
  } else if (ind.diferenca < -0.0001) {
    itens.push(
      `A conversão do cliente (${formatarPct(ind.conversaoRecorte)}) está ${pontos(
        ind.diferenca,
      )} abaixo da média do produto (${formatarPct(ind.mediaGeral)}).`,
    );
  } else {
    itens.push(
      `A conversão do cliente (${formatarPct(
        ind.conversaoRecorte,
      )}) está alinhada à média do produto (${formatarPct(ind.mediaGeral)}).`,
    );
  }

  itens.push(
    `Taxa de reprovação de ${formatarPct(ind.taxaReprovacao)} sobre ${inteiroBR(
      ind.decisoes,
    )} decisões (${inteiroBR(ind.aprovadas)} aprovadas, ${inteiroBR(ind.reprovadas)} reprovadas).`,
  );

  if (ind.emAnalise > 0) {
    itens.push(
      `${inteiroBR(ind.emAnalise)} oferta(s) ainda em análise — desfecho pode mover a conversão.`,
    );
  }

  if (motivos[0] && ind.reprovadas > 0) {
    itens.push(
      `Principal motivo de perda: "${motivos[0].motivo}" (${formatarPct(
        motivos[0].participacao,
      )} das reprovações).`,
    );
  }

  return itens;
}

function montarOndeAtuar(
  ind: Indicadores,
  rotas: LinhaRanking[],
  rotaColoader: LinhaRotaColoader[],
  motivos: LinhaMotivo[],
): string[] {
  const itens: string[] = [];
  const comDecisao = (l: LinhaRanking) => l.aprovadas + l.reprovadas > 0;

  // Rota de maior volume com pior conversão.
  const pior = minPor(rotas, (l) => l.conversao, comDecisao);
  if (pior && pior.reprovadas > 0) {
    itens.push(
      `Revisar pricing na rota "${pior.item}": conversão de ${formatarPct(
        pior.conversao,
      )} em ${inteiroBR(pior.aprovadas + pior.reprovadas)} decisões.`,
    );
  }

  // Combinação Rota × Coloader com mais reprovações.
  const critico = rotaColoader.find((l) => l.reprovadas > 0);
  if (critico) {
    itens.push(
      `Maior perda em "${critico.rota}" via ${critico.coloader}: ${inteiroBR(
        critico.reprovadas,
      )} reprovações (conversão ${formatarPct(critico.conversao)}).`,
    );
  }

  // Motivo dominante.
  if (motivos[0] && motivos[0].reprovadas > 0) {
    itens.push(
      `Atacar o motivo "${motivos[0].motivo}", responsável por ${formatarPct(
        motivos[0].participacao,
      )} das reprovações.`,
    );
  }

  // Ofertas represadas em análise.
  if (ind.emAnalise > 0) {
    itens.push(
      `Acompanhar ${inteiroBR(ind.emAnalise)} oferta(s) em análise para destravar decisões.`,
    );
  }

  if (itens.length === 0) {
    itens.push("Recorte saudável: nenhuma frente crítica de reprovação identificada.");
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
  const insightsPricing = montarInsightsPricing(indicadores, motivos);
  const ondeAtuar = montarOndeAtuar(indicadores, rotas, rotaColoader, motivos);

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
