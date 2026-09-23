import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parsePeriodo } from "@/lib/filtro-periodo";
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

function parseFiltros(input: unknown): {
  analista: string;
  dataInicial: string | null;
  dataFinal: string | null;
} {
  const raw = (input ?? {}) as Record<string, unknown>;
  const periodo = parsePeriodo(raw);
  const valor = raw["analista"];
  let analista = FILTRO_TODOS;
  if (typeof valor === "string") {
    const t = valor.trim();
    if (t !== "" && t !== FILTRO_TODOS) analista = normalizarAnalista(t);
  }
  return { analista, ...periodo };
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
  .inputValidator((input: unknown) => parseFiltros(input))
  .handler(async ({ context, data }): Promise<AnaliseAnalistas> => {
    const { analista, dataInicial, dataFinal } = data;
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { data: agregado, error } = await client.rpc("analistas_analise", {
      p_analista: analista,
      p_data_inicial: dataInicial,
      p_data_final: dataFinal,
    });
    if (error) throw new Error(error.message);

    return montarAnaliseAnalistas(analista, agregado as AgregadoAnalistas);
  });
