import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  FILTRO_TODOS,
  montarAnaliseMotivosPerda,
  type AgregadoMotivosPerda,
  type AnaliseMotivosPerda,
} from "@/lib/motivos-perda-analysis";

export type MotivosPerdaOpcoesFiltro = {
  motivos: string[];
};

function parseMotivo(input: unknown): { motivo: string } {
  const raw = (input ?? {}) as Record<string, unknown>;
  const valor = raw["motivo"];
  if (typeof valor !== "string") return { motivo: FILTRO_TODOS };
  const t = valor.trim();
  if (t === "" || t === FILTRO_TODOS) return { motivo: FILTRO_TODOS };
  return { motivo: t };
}

/**
 * Lista de motivos de reprovação do produto do usuário.
 * Produto garantido pela RLS de public.ofertas.
 */
export const getMotivosPerdaOpcoesFiltro = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MotivosPerdaOpcoesFiltro> => {
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    const { data, error } = await client.rpc("motivos_perda_opcoes_filtro");
    if (error) throw new Error(error.message);
    const raw = (data ?? {}) as Partial<MotivosPerdaOpcoesFiltro>;
    const motivos = [...(raw.motivos ?? [])].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
    return { motivos };
  });

/**
 * Ficha analítica completa de Motivos de Perda.
 * Filtro de motivo e agregações no banco; Produto via RLS (não aceito do frontend).
 */
export const getAnaliseMotivosPerda = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => parseMotivo(input))
  .handler(async ({ context, data }): Promise<AnaliseMotivosPerda> => {
    const { motivo } = data;
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { data: agregado, error } = await client.rpc("motivos_perda_analise", {
      p_motivo: motivo,
    });
    if (error) throw new Error(error.message);

    return montarAnaliseMotivosPerda(motivo, agregado as AgregadoMotivosPerda);
  });
