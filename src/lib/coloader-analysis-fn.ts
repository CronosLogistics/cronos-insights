import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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

function parseColoader(input: unknown): { coloader: string } {
  const raw = (input ?? {}) as Record<string, unknown>;
  const valor = raw["coloader"];
  if (typeof valor !== "string") return { coloader: FILTRO_TODOS };
  const t = valor.trim();
  if (t === "" || t === FILTRO_TODOS) return { coloader: FILTRO_TODOS };
  return { coloader: normalizarColoader(t) };
}

/**
 * Lista de coloaders/armadores do produto do usuário.
 * Produto garantido pela RLS de public.ofertas.
 */
export const getColoadersOpcoesFiltro = createServerFn({ method: "GET" })
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
export const getAnaliseColoaders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => parseColoader(input))
  .handler(async ({ context, data }): Promise<AnaliseColoaders> => {
    const { coloader } = data;
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { data: agregado, error } = await client.rpc("coloaders_analise", {
      p_coloader: coloader,
    });
    if (error) throw new Error(error.message);

    return montarAnaliseColoaders(coloader, agregado as AgregadoColoaders);
  });
