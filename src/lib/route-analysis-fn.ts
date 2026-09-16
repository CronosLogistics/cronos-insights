import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  montarAnaliseRotas,
  FILTRO_TODOS,
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
  return {
    paisOrigem: normalizarFiltro(raw["paisOrigem"]),
    portoOrigem: normalizarFiltro(raw["portoOrigem"]),
    paisDestino: normalizarFiltro(raw["paisDestino"]),
    portoDestino: normalizarFiltro(raw["portoDestino"]),
    rota: normalizarFiltro(raw["rota"]),
  };
}

/**
 * Opções dos filtros locais da ficha Rotas.
 * Agregação feita no banco; Produto garantido pela RLS de public.ofertas.
 */
export const getRotasOpcoesFiltro = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RotasOpcoesFiltro> => {
    const client = context.supabase as unknown as {
      rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    const { data, error } = await client.rpc("rotas_opcoes_filtro");
    if (error) throw new Error(error.message);
    const raw = (data ?? {}) as Partial<RotasOpcoesFiltro>;
    return {
      paisesOrigem: raw.paisesOrigem ?? [],
      portosOrigem: raw.portosOrigem ?? [],
      paisesDestino: raw.paisesDestino ?? [],
      portosDestino: raw.portosDestino ?? [],
      rotas: raw.rotas ?? [],
    };
  });

/**
 * Ficha analítica completa de Rotas.
 * Filtros locais e agregações aplicados no banco; Produto via RLS (não aceito do frontend).
 */
export const getAnaliseRotas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => parseFiltros(input))
  .handler(async ({ context, data }): Promise<AnaliseRotas> => {
    const filtros = data;
    const client = context.supabase as unknown as {
      rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { data: agregado, error } = await client.rpc("rotas_analise", {
      p_pais_origem: filtros.paisOrigem,
      p_porto_origem: filtros.portoOrigem,
      p_pais_destino: filtros.paisDestino,
      p_porto_destino: filtros.portoDestino,
      p_rota: filtros.rota,
    });
    if (error) throw new Error(error.message);

    return montarAnaliseRotas(filtros, agregado as AgregadoRotas);
  });
