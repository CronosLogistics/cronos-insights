import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

/** Tipos de frete existentes nas modalidades do usuário (calculado no banco). */
export const getModalidadesFrete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string[]> => {
    const client = context.supabase as unknown as RpcClient;
    const { data, error } = await client.rpc("modalidades_frete_opcoes");
    if (error) throw new Error(error.message);
    const lista = ((data ?? {}) as { modalidades?: unknown }).modalidades;
    return Array.isArray(lista)
      ? lista.filter((v): v is string => typeof v === "string")
      : [];
  });
