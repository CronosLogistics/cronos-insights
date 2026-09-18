import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  montarAnaliseQualidadeDados,
  type AgregadoQualidadeDados,
  type AnaliseQualidadeDados,
} from "@/lib/data-quality";

/**
 * Qualidade dos Dados (aba QUALIDADE_DADOS).
 * Sem filtros de frontend: Produto aplicado só via RLS no banco.
 */
export const getQualidadeDados = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AnaliseQualidadeDados> => {
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { data, error } = await client.rpc("qualidade_dados_analise");
    if (error) throw new Error(error.message);

    return montarAnaliseQualidadeDados(data as AgregadoQualidadeDados);
  });
