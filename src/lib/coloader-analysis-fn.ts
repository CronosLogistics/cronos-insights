import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parsePeriodo } from "@/lib/filtro-periodo";
import {
  FILTRO_TODOS,
  montarAnaliseColoaders,
  normalizarColoader,
  type AgregadoColoaders,
  type AnaliseColoaders,
} from "@/lib/coloader-analysis";

export type ColoadersOpcoesFiltro = {
  coloaders: string[];
};

function parseFiltros(input: unknown): {
  coloader: string;
  dataInicial: string | null;
  dataFinal: string | null;
} {
  const raw = (input ?? {}) as Record<string, unknown>;
  const periodo = parsePeriodo(raw);
  const valor = raw["coloader"];
  let coloader = FILTRO_TODOS;
  if (typeof valor === "string") {
    const t = valor.trim();
    if (t !== "" && t !== FILTRO_TODOS) coloader = normalizarColoader(t);
  }
  return { coloader, ...periodo };
}

/**
 * Lista de coloaders/armadores do produto do usuário.
 * Produto garantido pela RLS de public.ofertas.
 */
export const getColoadersOpcoesFiltro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ColoadersOpcoesFiltro> => {
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    const { data, error } = await client.rpc("coloaders_opcoes_filtro");
    if (error) throw new Error(error.message);
    const raw = (data ?? {}) as Partial<ColoadersOpcoesFiltro>;
    const coloaders = [...(raw.coloaders ?? [])].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
    return { coloaders };
  });

/**
 * Ficha analítica completa de Coloaders / Armadores.
 * Filtro de coloader e agregações no banco; Produto via RLS (não aceito do frontend).
 */
export const getAnaliseColoaders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => parseFiltros(input))
  .handler(async ({ context, data }): Promise<AnaliseColoaders> => {
    const { coloader, dataInicial, dataFinal } = data;
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { data: agregado, error } = await client.rpc("coloaders_analise", {
      p_coloader: coloader,
      p_data_inicial: dataInicial,
      p_data_final: dataFinal,
    });
    if (error) throw new Error(error.message);

    return montarAnaliseColoaders(coloader, agregado as AgregadoColoaders);
  });
