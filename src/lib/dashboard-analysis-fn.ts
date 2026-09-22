import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  FILTRO_TODOS,
  MIN_DECISOES,
  montarAnaliseDashboard,
  type AgregadoDashboard,
  type AnaliseDashboard,
  type DashboardOpcoesFiltro,
  type FiltrosDashboard,
} from "@/lib/dashboard-analysis";
import {
  mapearCotacaoEmAnalise,
  ordenarFila,
  type CotacaoEmAnalise,
} from "@/lib/cotacoes-em-analise-fn";

function textoFiltro(valor: unknown): string {
  if (typeof valor !== "string") return FILTRO_TODOS;
  const t = valor.trim();
  if (t === "" || t === FILTRO_TODOS) return FILTRO_TODOS;
  return t;
}

function dataIso(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const t = valor.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return t;
}

function parseFiltros(input: unknown): FiltrosDashboard {
  const raw = (input ?? {}) as Record<string, unknown>;
  return {
    dataInicial: dataIso(raw["dataInicial"]),
    dataFinal: dataIso(raw["dataFinal"]),
    analista: textoFiltro(raw["analista"]),
    vendedor: textoFiltro(raw["vendedor"]),
    cliente: textoFiltro(raw["cliente"]),
    origem: textoFiltro(raw["origem"]),
    destino: textoFiltro(raw["destino"]),
    rota: textoFiltro(raw["rota"]),
    coloader: textoFiltro(raw["coloader"]),
    resultado: textoFiltro(raw["resultado"]),
    motivo: textoFiltro(raw["motivo"]),
  };
}

function lista(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string" && v.trim() !== "");
}

/**
 * Opções dos filtros globais + min/max de Data_Base do produto do usuário.
 * Produto garantido pela RLS de public.ofertas.
 */
export const getDashboardOpcoesFiltro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardOpcoesFiltro> => {
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    const { data, error } = await client.rpc("dashboard_opcoes_filtro");
    if (error) throw new Error(error.message);
    const raw = (data ?? {}) as Record<string, unknown>;
    return {
      dataInicial: typeof raw["data_inicial"] === "string" ? raw["data_inicial"] : null,
      dataFinal: typeof raw["data_final"] === "string" ? raw["data_final"] : null,
      analistas: lista(raw["analistas"]),
      vendedores: lista(raw["vendedores"]),
      clientes: lista(raw["clientes"]),
      origens: lista(raw["origens"]),
      destinos: lista(raw["destinos"]),
      rotas: lista(raw["rotas"]),
      coloaders: lista(raw["coloaders"]),
      resultados: lista(raw["resultados"]),
      motivos: lista(raw["motivos"]),
    };
  });

/**
 * Análise completa do Dashboard.
 * Filtros e agregações no banco; Produto via RLS (não aceito do frontend).
 * Amostra mínima = MIN_DECISOES (TRATAMENTO!B5).
 * Cotação em análise mais antiga: primeira da fila COTAÇÕES_EM_ANALISE.
 */
export const getAnaliseDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => parseFiltros(input))
  .handler(async ({ context, data }): Promise<AnaliseDashboard> => {
    const client = context.supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const rpcPromise = client.rpc("dashboard_analise", {
      p_data_inicial: data.dataInicial,
      p_data_final: data.dataFinal,
      p_analista: data.analista,
      p_vendedor: data.vendedor,
      p_cliente: data.cliente,
      p_origem: data.origem,
      p_destino: data.destino,
      p_rota: data.rota,
      p_coloader: data.coloader,
      p_resultado: data.resultado,
      p_motivo: data.motivo,
      p_min_decisoes: MIN_DECISOES,
    });

    // Fila COTAÇÕES_EM_ANALISE: 1ª linha = maior Dias_Em_Aberto (SORTBY da planilha).
    const filaPromise = (async (): Promise<CotacaoEmAnalise | null> => {
      const { data: lote, error: errFila } = await context.supabase
        .from("ofertas")
        .select(
          "id,oferta,cliente,origem,destino,armador,pricing,vendedor,data_abertura,status",
        )
        .not("produto", "is", null)
        .eq("analise", "Em Aberto")
        .order("data_abertura", { ascending: true, nullsFirst: false })
        .limit(500);

      if (errFila) throw new Error(errFila.message);
      const ordenada = ordenarFila((lote ?? []).map(mapearCotacaoEmAnalise));
      return ordenada[0] ?? null;
    })();

    const [{ data: agregado, error }, maisAntiga] = await Promise.all([
      rpcPromise,
      filaPromise,
    ]);

    if (error) throw new Error(error.message);

    return montarAnaliseDashboard(
      data,
      (agregado ?? {}) as AgregadoDashboard,
      maisAntiga
        ? {
            oferta: maisAntiga.oferta,
            cliente: maisAntiga.cliente,
            rota: maisAntiga.rota,
            diasEmAberto: maisAntiga.dias_em_aberto,
          }
        : null,
    );
  });
