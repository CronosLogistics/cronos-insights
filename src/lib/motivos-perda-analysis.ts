// ============================================================================
// Calculadora pura da ficha "Motivos de Perda".
//
// Recebe agregações já filtradas (Inclui_Filtro / produto via RLS + Flag_Reprovada
// + filtro de motivo) e reproduz a aba MOTIVOS_PERDA da planilha
// "ANALISE COTAÇÕES".
// ============================================================================

import { formatarPct, MIN_DECISOES } from "@/lib/customer-analysis";

export { formatarPct, MIN_DECISOES };

export const FILTRO_TODOS = "Todos";

/** Limite de amostra = TRATAMENTO!B5. */
export const LIMITE_AMOSTRA = MIN_DECISOES;

export type IndicadoresMotivo = {
  reprovacoes: number;
  /** Fração 0–1 (= reprovações do motivo / total de reprovações filtradas). */
  pctReprovacoes: number;
  rotas: number;
  clientes: number;
  coloaders: number;
  agentes: number;
  meses: number;
  amostra: number;
  status: string;
  recorte: string;
};

export type PerfilMotivo = {
  principalRota: string;
  principalCliente: string;
  principalColoader: string;
  principalAgente: string;
};

export type LinhaMotivoDimensao = {
  item: string;
  reprovacoes: number;
  /** Fração 0–1 sobre o total de reprovações do motivo selecionado. */
  pctMotivo: number;
};

export type LinhaRotaCliente = {
  rota: string;
  cliente: string;
  reprovacoes: number;
};

export type LinhaEvolucaoMensal = {
  /** ISO date (1º dia do mês) ou rótulo. */
  mes: string;
  reprovacoes: number;
  /** Fração 0–1 (= reprovações do motivo no mês / total de reprovações do mês). */
  pctMes: number;
};

export type AnaliseMotivosPerda = {
  motivo: string;
  indicadores: IndicadoresMotivo;
  perfil: PerfilMotivo;
  insightsPricing: string[];
  ondeAtuar: string[];
  motivoRota: LinhaMotivoDimensao[];
  motivoCliente: LinhaMotivoDimensao[];
  coloaders: LinhaMotivoDimensao[];
  agentes: LinhaMotivoDimensao[];
  rotaCliente: LinhaRotaCliente[];
  evolucaoMensal: LinhaEvolucaoMensal[];
};

export type AgregadoMotivosPerda = {
  indicadores?: {
    reprovacoes?: number | null;
    pct_reprovacoes?: number | null;
    rotas?: number | null;
    clientes?: number | null;
    coloaders?: number | null;
    agentes?: number | null;
    meses?: number | null;
    amostra?: number | null;
  } | null;
  perfil?: {
    principal_rota?: string | null;
    principal_cliente?: string | null;
    principal_coloader?: string | null;
    principal_agente?: string | null;
  } | null;
  motivo_rota?: Array<{
    item?: string | null;
    reprovacoes?: number | null;
    pct_motivo?: number | null;
  }> | null;
  motivo_cliente?: Array<{
    item?: string | null;
    reprovacoes?: number | null;
    pct_motivo?: number | null;
  }> | null;
  coloaders?: Array<{
    item?: string | null;
    reprovacoes?: number | null;
    pct_motivo?: number | null;
  }> | null;
  agentes?: Array<{
    item?: string | null;
    reprovacoes?: number | null;
    pct_motivo?: number | null;
  }> | null;
  rota_cliente?: Array<{
    rota?: string | null;
    cliente?: string | null;
    reprovacoes?: number | null;
  }> | null;
  evolucao_mensal?: Array<{
    mes?: string | null;
    reprovacoes?: number | null;
    pct_mes?: number | null;
  }> | null;
};

function num(valor: number | null | undefined): number {
  return Number(valor ?? 0);
}

function textoOuTraco(valor: string | null | undefined): string {
  const t = (valor ?? "").trim();
  return t === "" ? "-" : t;
}

function statusAmostra(reprovacoes: number): string {
  if (reprovacoes < LIMITE_AMOSTRA) {
    return `Amostra pequena — ${reprovacoes.toLocaleString("pt-BR")} reprovações`;
  }
  return "Amostra relevante";
}

function montarInsights(
  ind: IndicadoresMotivo,
  perfil: PerfilMotivo,
): string[] {
  return [
    `O motivo representa ${formatarPct(ind.pctReprovacoes)} das reprovações filtradas (${ind.reprovacoes.toLocaleString("pt-BR")}).`,
    `Maior concentração em rota: ${perfil.principalRota}; cliente: ${perfil.principalCliente}.`,
    `Coloader mais associado: ${perfil.principalColoader}; agente: ${perfil.principalAgente}.`,
    ind.reprovacoes < LIMITE_AMOSTRA
      ? "Amostra pequena — evitar conclusões fortes."
      : "Amostra suficiente para investigar recorrência e concentração.",
  ];
}

function montarOndeAtuar(ind: IndicadoresMotivo, perfil: PerfilMotivo): string[] {
  return [
    ind.reprovacoes < LIMITE_AMOSTRA
      ? "ATENÇÃO — validar recorrência."
      : `ALTA PRIORIDADE — investigar a concentração em ${perfil.principalRota}.`,
    `ATENÇÃO — cliente mais associado: ${perfil.principalCliente}.`,
    `DEPENDÊNCIA — coloader mais associado: ${perfil.principalColoader}.`,
    "INVESTIGAR — acompanhar a evolução mensal e as combinações abaixo.",
  ];
}

function mapDimensao(
  linhas: AgregadoMotivosPerda["motivo_rota"],
): LinhaMotivoDimensao[] {
  return (linhas ?? []).map((l) => ({
    item: textoOuTraco(l.item),
    reprovacoes: num(l.reprovacoes),
    pctMotivo: num(l.pct_motivo),
  }));
}

/** Formata mes ISO / date string para rótulo mm/aaaa. */
export function formatarMesRotulo(mes: string): string {
  const m = mes.trim();
  if (!m) return "-";
  // YYYY-MM-DD ou YYYY-MM-DDTHH:MM:SS
  const match = /^(\d{4})-(\d{2})/.exec(m);
  if (match) return `${match[2]}/${match[1]}`;
  return m;
}

export function montarAnaliseMotivosPerda(
  motivo: string,
  agregado: AgregadoMotivosPerda,
): AnaliseMotivosPerda {
  const i = agregado.indicadores;
  const reprovacoes = num(i?.reprovacoes);
  const perfilRaw = agregado.perfil;

  const perfil: PerfilMotivo = {
    principalRota: textoOuTraco(perfilRaw?.principal_rota),
    principalCliente: textoOuTraco(perfilRaw?.principal_cliente),
    principalColoader: textoOuTraco(perfilRaw?.principal_coloader),
    principalAgente: textoOuTraco(perfilRaw?.principal_agente),
  };

  const indicadores: IndicadoresMotivo = {
    reprovacoes,
    pctReprovacoes: num(i?.pct_reprovacoes),
    rotas: num(i?.rotas),
    clientes: num(i?.clientes),
    coloaders: num(i?.coloaders),
    agentes: num(i?.agentes),
    meses: num(i?.meses),
    amostra: num(i?.amostra ?? i?.reprovacoes),
    status: statusAmostra(reprovacoes),
    recorte: motivo,
  };

  return {
    motivo,
    indicadores,
    perfil,
    insightsPricing: montarInsights(indicadores, perfil),
    ondeAtuar: montarOndeAtuar(indicadores, perfil),
    motivoRota: mapDimensao(agregado.motivo_rota),
    motivoCliente: mapDimensao(agregado.motivo_cliente),
    coloaders: mapDimensao(agregado.coloaders),
    agentes: mapDimensao(agregado.agentes),
    rotaCliente: (agregado.rota_cliente ?? []).map((l) => ({
      rota: textoOuTraco(l.rota),
      cliente: textoOuTraco(l.cliente),
      reprovacoes: num(l.reprovacoes),
    })),
    evolucaoMensal: (agregado.evolucao_mensal ?? []).map((l) => ({
      mes: String(l.mes ?? ""),
      reprovacoes: num(l.reprovacoes),
      pctMes: num(l.pct_mes),
    })),
  };
}
