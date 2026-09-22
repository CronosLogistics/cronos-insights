import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  FILTRO_TODOS,
  montarAnaliseAnalistas,
  normalizarAnalista,
  type AgregadoAnalistas,
  type AnaliseAnalistas,
} from "@/lib/analyst-analysis";

export type AnalistasOpcoesFiltro = {
  analistas: string[];
};

function parseAnalista(input: unknown): { analista: string } {
  const raw = (input ?? {}) as Record<string, unknown>;
  const valor = raw["analista"];
  if (typeof valor !== "string") return { analista: FILTRO_TODOS };
  const t = valor.trim();
  if (t === "" || t === FILTRO_TODOS) return { analista: FILTRO_TODOS };
  return { analista: normalizarAnalista(t) };
}

/**
 * Lista de Analistas Pricing do produto do usuário (ARRUMAR + vazio → Não informado).
 * Produto garantido pela RLS de public.ofertas.
 */
export const getAnalistasOpcoesFiltro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AnalistasOpcoesFiltro> => {
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    const { data, error } = await client.rpc("analistas_opcoes_filtro");
    if (error) throw new Error(error.message);
    const raw = (data ?? {}) as Partial<AnalistasOpcoesFiltro>;
    const analistas = [...(raw.analistas ?? [])].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
    return { analistas };
  });

/**
 * Ficha analítica completa de Analistas Pricing.
 * Filtro de analista e agregações no banco; Produto via RLS (não aceito do frontend).
 */
export const getAnaliseAnalistas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => parseAnalista(input))
  .handler(async ({ context, data }): Promise<AnaliseAnalistas> => {
    const { analista } = data;
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { data: agregado, error } = await client.rpc("analistas_analise", {
      p_analista: analista,
    });
    if (error) throw new Error(error.message);

    return montarAnaliseAnalistas(analista, agregado as AgregadoAnalistas);
  });
