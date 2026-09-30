import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parsePeriodo } from "@/lib/filtro-periodo";
import { parseModalidadeFrete } from "@/lib/modalidade-frete";

export type PontoOfertasMes = { mes: string; ofertas: number; linhas: number };

export type FiltrosOfertasMes = {
  coloader?: string | null;
  agente?: string | null;
  analista?: string | null;
  motivo?: string | null;
  rota?: string | null;
  paisOrigem?: string | null;
  portoOrigem?: string | null;
  paisDestino?: string | null;
  portoDestino?: string | null;
  anos?: number[];
  meses?: number[];
  modalidade?: string;
  somenteReprovadas?: boolean;
};

function txt(v: unknown): string {
  if (typeof v !== "string") return "Todos";
  const t = v.trim();
  return t === "" ? "Todos" : t;
}

/**
 * Quantidade de ofertas distintas por mês (qualquer resultado), no recorte da
 * tela. Produto/modalidades do usuário aplicados no banco.
 */
export const getOfertasPorMes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const raw = (input ?? {}) as Record<string, unknown>;
    return {
      p_coloader: txt(raw["coloader"]),
      p_agente: txt(raw["agente"]),
      p_analista: txt(raw["analista"]),
      p_motivo: txt(raw["motivo"]),
      p_rota: txt(raw["rota"]),
      p_pais_origem: txt(raw["paisOrigem"]),
      p_porto_origem: txt(raw["portoOrigem"]),
      p_pais_destino: txt(raw["paisDestino"]),
      p_porto_destino: txt(raw["portoDestino"]),
      ...(() => {
        const p = parsePeriodo(raw);
        return {
          p_anos: p.anos.length ? p.anos : null,
          p_meses: p.meses.length ? p.meses : null,
        };
      })(),
      p_modalidade: parseModalidadeFrete(raw["modalidade"]),
      p_somente_reprovadas: raw["somenteReprovadas"] === true,
    };
  })
  .handler(async ({ context, data }): Promise<PontoOfertasMes[]> => {
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    const { data: res, error } = await client.rpc("ofertas_por_mes", data);
    if (error) throw new Error(error.message);
    return ((res ?? []) as PontoOfertasMes[]).map((p) => ({
      mes: String(p.mes),
      ofertas: Number(p.ofertas ?? 0),
      linhas: Number(p.linhas ?? 0),
    }));
  });
