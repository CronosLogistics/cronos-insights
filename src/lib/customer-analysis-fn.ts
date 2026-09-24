import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dataNoPeriodo, parsePeriodo } from "@/lib/filtro-periodo";
import { FRETE_TODOS, parseModalidadeFrete } from "@/lib/modalidade-frete";
import { analisarCliente, type AnaliseCliente, type HistRow } from "@/lib/customer-analysis";

const PAGINA = 1000;

/** Opção do seletor de cliente. */
export type ClienteOpcao = { cliente: string; ofertas: number };

type HistRowComData = HistRow & { data_abertura?: string | null; id?: number };

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
    return {
      cliente: cliente.trim(),
      ...parsePeriodo(raw),
      modalidade: parseModalidadeFrete(raw["modalidade"]),
    };
  })
  .handler(async ({ context, data }): Promise<AnaliseCliente> => {
    const { supabase } = context;
    const { cliente, anos, meses, modalidade } = data;
    const periodo = { anos, meses };

    // Busca paginada das linhas do cliente (uma revisão por linha).
    const rowsBrutos: HistRowComData[] = [];
    for (let inicio = 0; ; inicio += PAGINA) {
      const { data: pagina, error } = await supabase
        .from("v_ofertas_analitico")
        .select(
          "id,oferta,cliente_analitico,rota_analitica,coloader_analitico,agente_analitico,motivo_perda_analitico,flag_aprovada,flag_reprovada,flag_em_analise",
        )
        .eq("cliente_analitico", cliente)
        .order("id", { ascending: true })
        .range(inicio, inicio + PAGINA - 1);
      if (error) throw new Error(error.message);
      const lote = (pagina ?? []) as unknown as HistRowComData[];
      rowsBrutos.push(...lote);
      if (lote.length < PAGINA) break;
    }

    // Período e tipo de frete: busca data/modalidade na base (RLS aplicada).
    const comPeriodo = anos.length > 0 || meses.length > 0;
    const comFrete = modalidade !== FRETE_TODOS;
    let idsOk: Set<number> | null = null;
    if (comPeriodo || comFrete) {
      idsOk = new Set<number>();
      const ids = rowsBrutos.map((r) => r.id).filter((v): v is number => typeof v === "number");
      for (let i = 0; i < ids.length; i += 300) {
        const bloco = ids.slice(i, i + 300);
        const { data: lote, error } = await supabase
          .from("ofertas")
          .select("id,modalidade,data_abertura")
          .in("id", bloco);
        if (error) throw new Error(error.message);
        for (const l of lote ?? []) {
          const m = (l.modalidade ?? "").trim() || "Não informado";
          if (comFrete && m !== modalidade) continue;
          if (comPeriodo && !dataNoPeriodo(l.data_abertura, periodo)) continue;
          idsOk.add(Number(l.id));
        }
      }
    }

    const rows: HistRow[] = rowsBrutos
      .filter((r) => !idsOk || (typeof r.id === "number" && idsOk.has(r.id)))
      .map(({ data_abertura: _d, id: _id, ...resto }) => resto);

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
