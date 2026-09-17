import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  FILTRO_TODOS,
  montarAnaliseAgentes,
  normalizarAgente,
  type AgregadoAgentes,
  type AnaliseAgentes,
} from "@/lib/agent-analysis";

export type AgentesOpcoesFiltro = {
  agentes: string[];
};

function parseAgente(input: unknown): { agente: string } {
  const raw = (input ?? {}) as Record<string, unknown>;
  const valor = raw["agente"];
  if (typeof valor !== "string") return { agente: FILTRO_TODOS };
  const t = valor.trim();
  if (t === "" || t === FILTRO_TODOS) return { agente: FILTRO_TODOS };
  return { agente: normalizarAgente(t) };
}

/**
 * Lista de agentes do produto do usuário (ARRUMAR + vazio → Não informado).
 * Produto garantido pela RLS de public.ofertas.
 */
export const getAgentesOpcoesFiltro = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AgentesOpcoesFiltro> => {
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    const { data, error } = await client.rpc("agentes_opcoes_filtro");
    if (error) throw new Error(error.message);
    const raw = (data ?? {}) as Partial<AgentesOpcoesFiltro>;
    const agentes = [...(raw.agentes ?? [])].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return { agentes };
  });

/**
 * Ficha analítica completa de Agentes.
 * Filtro de agente e agregações no banco; Produto via RLS (não aceito do frontend).
 */
export const getAnaliseAgentes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => parseAgente(input))
  .handler(async ({ context, data }): Promise<AnaliseAgentes> => {
    const { agente } = data;
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { data: agregado, error } = await client.rpc("agentes_analise", {
      p_agente: agente,
    });
    if (error) throw new Error(error.message);

    return montarAnaliseAgentes(agente, agregado as AgregadoAgentes);
  });
