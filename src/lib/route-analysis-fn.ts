import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FRETE_TODOS, parseModalidadeFrete } from "@/lib/modalidade-frete";
import { parsePeriodo, periodoParaRpc } from "@/lib/filtro-periodo";
import {
  montarAnaliseRotas,
  FILTRO_TODOS,
  ROTA_INCOMPLETA,
  type AgregadoRotas,
  type AnaliseRotas,
  type FiltrosRotas,
} from "@/lib/route-analysis";

export type RotasOpcoesFiltro = {
  paisesOrigem: string[];
  portosOrigem: string[];
  paisesDestino: string[];
  portosDestino: string[];
  rotas: string[];
};

function normalizarFiltro(valor: unknown): string {
  if (typeof valor !== "string") return FILTRO_TODOS;
  const t = valor.trim();
  return t === "" ? FILTRO_TODOS : t;
}

function parseFiltros(input: unknown): FiltrosRotas {
  const raw = (input ?? {}) as Record<string, unknown>;
  const periodo = parsePeriodo(raw);
  return {
    paisOrigem: normalizarFiltro(raw["paisOrigem"]),
    portoOrigem: normalizarFiltro(raw["portoOrigem"]),
    paisDestino: normalizarFiltro(raw["paisDestino"]),
    portoDestino: normalizarFiltro(raw["portoDestino"]),
    rota: normalizarFiltro(raw["rota"]),
    anos: periodo.anos,
    meses: periodo.meses,
  };
}

/**
 * Opções dos filtros locais da ficha Rotas.
 * Agregação feita no banco; Produto garantido pela RLS de public.ofertas.
 */
export const getRotasOpcoesFiltro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RotasOpcoesFiltro> => {
    const client = context.supabase as unknown as {
      rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    const { data, error } = await client.rpc("rotas_opcoes_filtro");
    if (error) throw new Error(error.message);
    const raw = (data ?? {}) as Partial<RotasOpcoesFiltro>;
    const rotas = [...(raw.rotas ?? [])];
    if (!rotas.includes(ROTA_INCOMPLETA)) rotas.push(ROTA_INCOMPLETA);
    rotas.sort((a, b) => a.localeCompare(b, "pt-BR"));
    return {
      paisesOrigem: raw.paisesOrigem ?? [],
      portosOrigem: raw.portosOrigem ?? [],
      paisesDestino: raw.paisesDestino ?? [],
      portosDestino: raw.portosDestino ?? [],
      rotas,
    };
  });

/**
 * Ficha analítica completa de Rotas.
 * Filtros locais e agregações aplicados no banco; Produto via RLS (não aceito do frontend).
 */
export const getAnaliseRotas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({ ...parseFiltros(input), modalidade: parseModalidadeFrete((input as Record<string, unknown> | null)?.["modalidade"]) }))
  .handler(async ({ context, data }): Promise<AnaliseRotas> => {
    const { anos, meses, ...resto } = data;
    const { p_anos, p_meses } = periodoParaRpc({ anos, meses });
    const filtros = data;
    const client = context.supabase as unknown as {
      rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { data: agregado, error } = await client.rpc(data.modalidade === FRETE_TODOS ? "rotas_analise" : "rotas_analise_frete", {
      ...(data.modalidade === FRETE_TODOS ? {} : { p_modalidade: data.modalidade }),
      p_pais_origem: resto.paisOrigem,
      p_porto_origem: resto.portoOrigem,
      p_pais_destino: resto.paisDestino,
      p_porto_destino: resto.portoDestino,
      p_rota: resto.rota,
      p_anos,
      p_meses,
    });
    if (error) throw new Error(error.message);

    return montarAnaliseRotas(filtros, agregado as AgregadoRotas);
  });
