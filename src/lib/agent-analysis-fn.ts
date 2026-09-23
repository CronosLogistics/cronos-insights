import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parsePeriodo } from "@/lib/filtro-periodo";
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

function parseFiltros(input: unknown): {
  agente: string;
  dataInicial: string | null;
  dataFinal: string | null;
} {
  const raw = (input ?? {}) as Record<string, unknown>;
  const periodo = parsePeriodo(raw);
  const valor = raw["agente"];
  let agente = FILTRO_TODOS;
  if (typeof valor === "string") {
    const t = valor.trim();
    if (t !== "" && t !== FILTRO_TODOS) agente = normalizarAgente(t);
  }
  return { agente, ...periodo };
}

/**
 * Lista de agentes do produto do usuário (ARRUMAR + vazio → Não informado).
 * Produto garantido pela RLS de public.ofertas.
 */
export const getAgentesOpcoesFiltro = createServerFn({ method: "POST" })
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
export const getAnaliseAgentes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => parseFiltros(input))
  .handler(async ({ context, data }): Promise<AnaliseAgentes> => {
    const { agente, dataInicial, dataFinal } = data;
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { data: agregado, error } = await client.rpc("agentes_analise", {
      p_agente: agente,
      p_data_inicial: dataInicial,
      p_data_final: dataFinal,
    });
    if (error) throw new Error(error.message);

    return montarAnaliseAgentes(agente, agregado as AgregadoAgentes);
  });
