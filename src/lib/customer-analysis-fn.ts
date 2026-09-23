import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parsePeriodo } from "@/lib/filtro-periodo";
import { analisarCliente, type AnaliseCliente, type HistRow } from "@/lib/customer-analysis";

const PAGINA = 1000;

/** Opção do seletor de cliente. */
export type ClienteOpcao = { cliente: string; ofertas: number };

/**
 * Lista de clientes disponíveis para o produto do usuário.
 * O filtro por produto é garantido pela RLS de public.ofertas (a visão é
 * security_invoker). Ordena alfabeticamente, como o SORT() da planilha.
 */
export const getClienteLista = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClienteOpcao[]> => {
    // A API devolve no máximo 1000 linhas por resposta: pagina até esgotar.
    const linhas: Array<{ cliente: string | null; ofertas: number | null }> = [];
    for (let inicio = 0; ; inicio += PAGINA) {
      const { data, error } = await context.supabase
        .from("v_cliente_lista")
        .select("cliente,ofertas")
        .order("cliente", { ascending: true })
        .range(inicio, inicio + PAGINA - 1);
      if (error) throw new Error(error.message);
      const lote = (data ?? []) as Array<{ cliente: string | null; ofertas: number | null }>;
      linhas.push(...lote);
      if (lote.length < PAGINA) break;
    }
    // Consolida eventuais repetições do mesmo nome.
    const porCliente = new Map<string, number>();
    for (const l of linhas) {
      if (!l.cliente) continue;
      porCliente.set(l.cliente, (porCliente.get(l.cliente) ?? 0) + Number(l.ofertas ?? 0));
    }
    return [...porCliente.entries()]
      .map(([cliente, ofertas]) => ({ cliente, ofertas }))
      .sort((a, b) => a.cliente.localeCompare(b.cliente, "pt-BR"));
  });

/**
 * Ficha analítica completa de um cliente. Busca apenas as linhas do cliente
 * selecionado (Inclui_Filtro = 1) e a média geral do produto, ambos filtrados
 * no banco, e faz as agregações/rankings na calculadora.
 */
export const getAnaliseCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const raw = (input ?? {}) as Record<string, unknown>;
    const cliente = raw["cliente"];
    if (typeof cliente !== "string" || cliente.trim() === "") {
      throw new Error("Cliente inválido");
    }
    return { cliente: cliente.trim(), ...parsePeriodo(raw) };
  })
  .handler(async ({ context, data }): Promise<AnaliseCliente> => {
    const { supabase } = context;
    const { cliente, dataInicial, dataFinal } = data;

    // Busca paginada das linhas do cliente (uma revisão por linha).
    const rows: HistRow[] = [];
    for (let inicio = 0; ; inicio += PAGINA) {
      let query = supabase
        .from("v_ofertas_analitico")
        .select(
          "oferta,cliente_analitico,rota_analitica,coloader_analitico,agente_analitico,motivo_perda_analitico,flag_aprovada,flag_reprovada,flag_em_analise",
        )
        .eq("cliente_analitico", cliente)
        .order("id", { ascending: true })
        .range(inicio, inicio + PAGINA - 1);
      if (dataInicial) query = query.gte("data_abertura", dataInicial);
      if (dataFinal) query = query.lte("data_abertura", dataFinal);
      const { data: pagina, error } = await query;
      if (error) throw new Error(error.message);
      const lote = (pagina ?? []) as unknown as HistRow[];
      rows.push(...lote);
      if (lote.length < PAGINA) break;
    }

    // Média geral do produto (base inteira, Inclui_Filtro = 1).
    const { data: media, error: erroMedia } = await supabase
      .from("v_cliente_media_geral")
      .select("aprovadas,reprovadas")
      .maybeSingle();
    if (erroMedia) throw new Error(erroMedia.message);

    return analisarCliente({
      cliente,
      rows,
      mediaAprovadas: Number(media?.aprovadas ?? 0),
      mediaReprovadas: Number(media?.reprovadas ?? 0),
    });
  });
