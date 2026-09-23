import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parsePeriodo, type FiltroPeriodo } from "@/lib/filtro-periodo";
import {
  montarAnaliseQualidadeDados,
  type AgregadoQualidadeDados,
  type AnaliseQualidadeDados,
} from "@/lib/data-quality";

/**
 * Qualidade dos Dados (aba QUALIDADE_DADOS).
 * Período opcional; Produto aplicado só via RLS no banco.
 */
export const getQualidadeDados = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): FiltroPeriodo => {
    const raw = (input ?? {}) as Record<string, unknown>;
    return parsePeriodo(raw);
  })
  .handler(async ({ context, data }): Promise<AnaliseQualidadeDados> => {
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { data: agregado, error } = await client.rpc("qualidade_dados_analise", {
      p_data_inicial: data.dataInicial,
      p_data_final: data.dataFinal,
    });
    if (error) throw new Error(error.message);

    return montarAnaliseQualidadeDados(agregado as AgregadoQualidadeDados);
  });
