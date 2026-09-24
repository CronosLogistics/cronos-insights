import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FRETE_TODOS, parseModalidadeFrete } from "@/lib/modalidade-frete";
import { parsePeriodo, periodoParaRpc, type FiltroPeriodo } from "@/lib/filtro-periodo";
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
  .inputValidator((input: unknown): FiltroPeriodo & { modalidade: string } => {
    const raw = (input ?? {}) as Record<string, unknown>;
    return { ...parsePeriodo(raw), modalidade: parseModalidadeFrete(raw["modalidade"]) };
  })
  .handler(async ({ context, data }): Promise<AnaliseQualidadeDados> => {
    const { p_anos, p_meses } = periodoParaRpc(data);
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { data: agregado, error } = await client.rpc(data.modalidade === FRETE_TODOS ? "qualidade_dados_analise" : "qualidade_dados_analise_frete", {
      ...(data.modalidade === FRETE_TODOS ? {} : { p_modalidade: data.modalidade }),
      p_anos,
      p_meses,
    });
    if (error) throw new Error(error.message);

    return montarAnaliseQualidadeDados(agregado as AgregadoQualidadeDados);
  });
