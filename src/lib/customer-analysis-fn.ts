import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parsePeriodo } from "@/lib/filtro-periodo";
import { FRETE_TODOS, parseModalidadeFrete } from "@/lib/modalidade-frete";
import { analisarCliente, type AnaliseCliente, type HistRow, type HistoricoAprovacao } from "@/lib/customer-analysis";

const PAGINA = 1000;

/** Opção do seletor de cliente. */
export type ClienteOpcao = { cliente: string; ofertas: number };

type OfertaClienteRow = {
  id: number;
  oferta: string | null;
  cliente: string | null;
  origem: string | null;
  destino: string | null;
  armador: string | null;
  agente: string | null;
  motivo: string | null;
  analise: string | null;
};

function textoNormalizado(valor: string | null, fallback = "(Não informado)"): string {
  const texto = (valor ?? "").trim();
  return texto || fallback;
}

function normalizarOfertaCliente(row: OfertaClienteRow): HistRow {
  const origem = (row.origem ?? "").trim();
  const destino = (row.destino ?? "").trim();
  return {
    oferta: row.oferta,
    cliente_analitico: textoNormalizado(row.cliente),
    rota_analitica: origem && destino ? `${origem} → ${destino}` : "(Rota incompleta)",
    coloader_analitico: textoNormalizado(row.armador),
    agente_analitico: textoNormalizado(row.agente).replace(/\s+/g, " "),
    motivo_perda_analitico: textoNormalizado(row.motivo),
    flag_aprovada: row.analise === "Aprovado" ? 1 : 0,
    flag_reprovada: row.analise === "Reprovado" ? 1 : 0,
    flag_em_analise: row.analise === "Em Aberto" ? 1 : 0,
  };
}

type SupabaseCtx = Parameters<
  Parameters<ReturnType<typeof createServerFn>["handler"]>[0]
>[0] extends never ? never : any; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Última aprovação do cliente (data de conclusão, com fallback na abertura) e
 * quantas reprovações vieram depois dela. Respeita o tipo de frete; RLS
 * garante o recorte por modalidade do usuário.
 */
async function buscarHistoricoAprovacao(
  supabase: SupabaseCtx,
  cliente: string,
  modalidade: string,
): Promise<HistoricoAprovacao> {
  const comFrete = (q: SupabaseCtx) =>
    modalidade === FRETE_TODOS
      ? q
      : modalidade === "Não informado"
        ? q.or("modalidade.is.null,modalidade.eq.")
        : q.eq("modalidade", modalidade);

  const { data: aprov, error } = await comFrete(
    supabase
      .from("ofertas")
      .select("oferta,revisao,origem,destino,data_conclusao,data_abertura")
      .eq("cliente", cliente)
      .eq("analise", "Aprovado"),
  )
    .order("data_conclusao", { ascending: false, nullsFirst: false })
    .order("data_abertura", { ascending: false, nullsFirst: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const ultima = (aprov ?? [])[0] as
    | { oferta: string; revisao: number | null; origem: string | null; destino: string | null; data_conclusao: string | null; data_abertura: string | null }
    | undefined;

  let q = comFrete(
    supabase
      .from("ofertas")
      .select("id", { count: "exact", head: true })
      .eq("cliente", cliente)
      .eq("analise", "Reprovado"),
  );
  const data = ultima ? (ultima.data_conclusao ?? ultima.data_abertura) : null;
  if (data) q = q.gt(ultima!.data_conclusao ? "data_conclusao" : "data_abertura", data);
  const { count, error: errRep } = await q;
  if (errRep) throw new Error(errRep.message);

  if (!ultima) return { ultimaAprovacao: null, reprovadasDesde: count ?? 0 };
  const origem = (ultima.origem ?? "").trim();
  const destino = (ultima.destino ?? "").trim();
  return {
    ultimaAprovacao: {
      rota: origem && destino ? `${origem} → ${destino}` : "(Rota incompleta)",
      data,
      oferta: ultima.revisao != null ? `${ultima.oferta} (rev. ${ultima.revisao})` : ultima.oferta,
    },
    reprovadasDesde: count ?? 0,
  };
}

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
    // Consulta a tabela indexada diretamente e aplica todos os filtros antes
    // de transferir as linhas. A RLS de ofertas mantém o recorte por produto.
    const rows: HistRow[] = [];
    for (let inicio = 0; ; inicio += PAGINA) {
      const { data: pagina, error } = await supabase.rpc("cliente_ofertas_analise", {
        p_cliente: cliente,
        ...(anos.length > 0 ? { p_anos: anos } : {}),
        ...(meses.length > 0 ? { p_meses: meses } : {}),
        p_modalidade: modalidade,
        p_limite: PAGINA,
        p_offset: inicio,
      });
      if (error) throw new Error(error.message);
      const lote = (pagina ?? []) as OfertaClienteRow[];
      rows.push(...lote.map(normalizarOfertaCliente));
      if (lote.length < PAGINA) break;
    }

    // Média geral do produto (base inteira, Inclui_Filtro = 1).
    const { data: media, error: erroMedia } = await supabase
      .from("v_cliente_media_geral")
      .select("aprovadas,reprovadas")
      .maybeSingle();
    if (erroMedia) throw new Error(erroMedia.message);

    const resultado = analisarCliente({
      cliente,
      rows,
      mediaAprovadas: Number(media?.aprovadas ?? 0),
      mediaReprovadas: Number(media?.reprovadas ?? 0),
    });
    resultado.historico = await buscarHistoricoAprovacao(supabase, cliente, modalidade);
    return resultado;
  });
