import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  analisarRotas,
  FILTRO_TODOS,
  type AnaliseRotas,
  type FiltrosRotas,
  type RouteHistRow,
} from "@/lib/route-analysis";

const PAGINA = 1000;

const COLUNAS_OFERTA =
  "oferta,cliente,origem,destino,pais_origem,pais_destino,armador,agente,motivo,analise";

export type RotasOpcoesFiltro = {
  paisesOrigem: string[];
  portosOrigem: string[];
  paisesDestino: string[];
  portosDestino: string[];
  rotas: string[];
};

type OfertaRaw = {
  oferta: string;
  cliente: string | null;
  origem: string | null;
  destino: string | null;
  pais_origem: string | null;
  pais_destino: string | null;
  armador: string | null;
  agente: string | null;
  motivo: string | null;
  analise: string | null;
};

type LinhaRotas = {
  oferta: string | null;
  cliente_analitico: string;
  rota_analitica: string;
  pais_origem: string;
  porto_origem: string;
  pais_destino: string;
  porto_destino: string;
  coloader_analitico: string;
  agente_analitico: string;
  motivo_perda_analitico: string;
  flag_aprovada: number;
  flag_reprovada: number;
  flag_em_analise: number;
};

type AppSupabase = SupabaseClient<Database>;

function normalizarFiltro(valor: unknown): string {
  if (typeof valor !== "string") return FILTRO_TODOS;
  const t = valor.trim();
  return t === "" ? FILTRO_TODOS : t;
}

function parseFiltros(input: unknown): FiltrosRotas {
  const raw = (input ?? {}) as Record<string, unknown>;
  return {
    paisOrigem: normalizarFiltro(raw["paisOrigem"]),
    portoOrigem: normalizarFiltro(raw["portoOrigem"]),
    paisDestino: normalizarFiltro(raw["paisDestino"]),
    portoDestino: normalizarFiltro(raw["portoDestino"]),
    rota: normalizarFiltro(raw["rota"]),
  };
}

function unicosOrdenados(valores: Iterable<string>): string[] {
  return [...new Set(valores)].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function texto(valor: string | null | undefined, fallback = "(Não informado)"): string {
  const t = (valor ?? "").trim();
  return t === "" ? fallback : t;
}

/** Mesma regra da view v_ofertas_analitico / aba ROTAS. */
function mapearLinha(o: OfertaRaw): LinhaRotas {
  return {
    oferta: o.oferta,
    cliente_analitico: texto(o.cliente),
    rota_analitica: `${texto(o.origem, "Não informado")} → ${texto(o.destino, "Não informado")}`,
    pais_origem: texto(o.pais_origem),
    porto_origem: texto(o.origem),
    pais_destino: texto(o.pais_destino),
    porto_destino: texto(o.destino),
    coloader_analitico: texto(o.armador),
    agente_analitico: texto(o.agente),
    motivo_perda_analitico: texto(o.motivo),
    flag_aprovada: o.analise === "Aprovado" ? 1 : 0,
    flag_reprovada: o.analise === "Reprovado" ? 1 : 0,
    flag_em_analise: o.analise === "Em Aberto" ? 1 : 0,
  };
}

function passaFiltros(l: LinhaRotas, f: FiltrosRotas): boolean {
  if (f.paisOrigem !== FILTRO_TODOS && l.pais_origem !== f.paisOrigem) return false;
  if (f.portoOrigem !== FILTRO_TODOS && l.porto_origem !== f.portoOrigem) return false;
  if (f.paisDestino !== FILTRO_TODOS && l.pais_destino !== f.paisDestino) return false;
  if (f.portoDestino !== FILTRO_TODOS && l.porto_destino !== f.portoDestino) return false;
  if (f.rota !== FILTRO_TODOS && l.rota_analitica !== f.rota) return false;
  return true;
}

async function carregarBaseProduto(supabase: AppSupabase): Promise<LinhaRotas[]> {
  const linhas: LinhaRotas[] = [];
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await supabase
      .from("ofertas")
      .select(COLUNAS_OFERTA)
      .order("id", { ascending: true })
      .range(inicio, inicio + PAGINA - 1);
    if (error) throw new Error(error.message);
    const lote = (data ?? []) as unknown as OfertaRaw[];
    for (const o of lote) linhas.push(mapearLinha(o));
    if (lote.length < PAGINA) break;
  }
  return linhas;
}

/**
 * Opções dos filtros locais da ficha Rotas.
 * Produto garantido pela RLS de public.ofertas.
 */
export const getRotasOpcoesFiltro = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RotasOpcoesFiltro> => {
    const base = await carregarBaseProduto(context.supabase);
    return {
      paisesOrigem: unicosOrdenados(base.map((l) => l.pais_origem)),
      portosOrigem: unicosOrdenados(base.map((l) => l.porto_origem)),
      paisesDestino: unicosOrdenados(base.map((l) => l.pais_destino)),
      portosDestino: unicosOrdenados(base.map((l) => l.porto_destino)),
      rotas: unicosOrdenados(base.map((l) => l.rota_analitica)),
    };
  });

/**
 * Ficha analítica completa de Rotas.
 * Filtros locais aplicados no servidor; Produto via RLS (não aceito do frontend).
 */
export const getAnaliseRotas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => parseFiltros(input))
  .handler(async ({ context, data }): Promise<AnaliseRotas> => {
    const { supabase } = context;
    const filtros = data;

    const base = await carregarBaseProduto(supabase);
    const rows = base.filter((l) => passaFiltros(l, filtros));

    // Média geral do produto (sem filtros locais de origem/destino/rota).
    const { data: media, error: erroMedia } = await supabase
      .from("v_cliente_media_geral")
      .select("aprovadas,reprovadas")
      .maybeSingle();
    if (erroMedia) throw new Error(erroMedia.message);

    return analisarRotas({
      filtros,
      rows,
      mediaAprovadas: Number(media?.aprovadas ?? 0),
      mediaReprovadas: Number(media?.reprovadas ?? 0),
    });
  });
