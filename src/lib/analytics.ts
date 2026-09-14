import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type Linha = Record<string, string | number | null>;

/** Formatação padrão dos valores exibidos nas tabelas analíticas. */
export function formatarValor(
  valor: string | number | null,
  tipo: "texto" | "numero" | "pct" | "data" | "decimal" = "texto",
) {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (tipo === "numero") return Number(valor).toLocaleString("pt-BR");
  if (tipo === "decimal")
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  if (tipo === "pct")
    return `${Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  if (tipo === "data") {
    const [ano, mes, dia] = String(valor).split("-");
    return `${dia}/${mes}/${ano}`;
  }
  return String(valor);
}

/** Indicadores gerais da base de ofertas importada do relatório corporativo. */
export function useKpisGerais() {
  return useQuery({
    queryKey: ["kpis-gerais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_kpis_geral").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Data/hora da última carga concluída do relatório de Ofertas. */
export function useUltimaImportacao() {
  return useQuery({
    queryKey: ["ultima-importacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("importacoes")
        .select("concluido_em, linhas, situacao, arquivo_modificado_em")
        .order("iniciado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function formatarDataHora(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
