import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FRETE_TODOS, parseModalidadeFrete } from "@/lib/modalidade-frete";
import { parsePeriodo, periodoParaRpc } from "@/lib/filtro-periodo";
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
  anos: number[];
  meses: number[];
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
  .inputValidator((input: unknown) => ({ ...parseFiltros(input), modalidade: parseModalidadeFrete((input as Record<string, unknown> | null)?.["modalidade"]) }))
  .handler(async ({ context, data }): Promise<AnaliseColoaders> => {
    const { coloader, anos, meses } = data;
    const { p_anos, p_meses } = periodoParaRpc({ anos, meses });
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { data: agregado, error } = await client.rpc(data.modalidade === FRETE_TODOS ? "coloaders_analise" : "coloaders_analise_frete", {
      ...(data.modalidade === FRETE_TODOS ? {} : { p_modalidade: data.modalidade }),
      p_coloader: coloader,
      p_anos,
      p_meses,
    });
    if (error) throw new Error(error.message);

    return montarAnaliseColoaders(coloader, agregado as AgregadoColoaders);
  });
