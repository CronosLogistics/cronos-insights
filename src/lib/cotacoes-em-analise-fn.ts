/**
 * Fila COTAÇÕES_EM_ANALISE.
 * Mapeia linhas de public.ofertas (Análise = "Em Aberto") e ordena como o
 * SORTBY da planilha: maior Dias_Em_Aberto primeiro.
 */

export type LinhaOfertaEmAnalise = {
  id?: string | number | null;
  oferta?: string | null;
  cliente?: string | null;
  origem?: string | null;
  destino?: string | null;
  armador?: string | null;
  pricing?: string | null;
  vendedor?: string | null;
  data_abertura?: string | null;
  status?: string | null;
};

export type CotacaoEmAnalise = {
  id: string;
  oferta: string;
  cliente: string;
  rota: string;
  coloader: string;
  pricing: string;
  vendedor: string;
  data_abertura: string | null;
  status: string;
  dias_em_aberto: number | null;
};

const NAO_INFORMADO = "(Não informado)";
const MS_DIA = 24 * 60 * 60 * 1000;

function texto(valor: unknown): string {
  if (typeof valor !== "string") return NAO_INFORMADO;
  const t = valor.trim();
  return t === "" ? NAO_INFORMADO : t;
}

function diasEmAberto(dataAbertura: string | null): number | null {
  if (!dataAbertura) return null;
  const inicio = new Date(dataAbertura).getTime();
  if (Number.isNaN(inicio)) return null;
  return Math.max(0, Math.floor((Date.now() - inicio) / MS_DIA));
}

export function mapearCotacaoEmAnalise(linha: LinhaOfertaEmAnalise): CotacaoEmAnalise {
  const origem = texto(linha.origem);
  const destino = texto(linha.destino);
  const abertura = typeof linha.data_abertura === "string" ? linha.data_abertura : null;

  return {
    id: String(linha.id ?? `${linha.oferta ?? ""}`),
    oferta: texto(linha.oferta),
    cliente: texto(linha.cliente),
    rota: `${origem} → ${destino}`,
    coloader: texto(linha.armador),
    pricing: texto(linha.pricing),
    vendedor: texto(linha.vendedor),
    data_abertura: abertura,
    status: texto(linha.status),
    dias_em_aberto: diasEmAberto(abertura),
  };
}

/** Maior Dias_Em_Aberto primeiro; sem data vai para o fim. */
export function ordenarFila(fila: CotacaoEmAnalise[]): CotacaoEmAnalise[] {
  return [...fila].sort((a, b) => {
    const da = a.dias_em_aberto;
    const db = b.dias_em_aberto;
    if (da == null && db == null) return 0;
    if (da == null) return 1;
    if (db == null) return -1;
    return db - da;
  });
}
