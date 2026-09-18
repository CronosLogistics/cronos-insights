// ============================================================================
// Calculadora pura da tela "Qualidade dos Dados".
//
// Recebe agregações filtradas por produto (RLS) e reproduz a aba
// QUALIDADE_DADOS da planilha "ANALISE COTAÇÕES".
// ============================================================================

/** Linha da tabela 1 — indicadores de qualidade. */
export type IndicadorQualidade = {
  indicador: string;
  quantidade: number;
  /** Fração 0–1 (= quantidade / linhas_base); 0 se base vazia (SEERRO). */
  pctBase: number;
  impacto: string;
};

/** Linha da tabela 2 — preenchimento por campo. */
export type CampoPreenchimento = {
  campo: string;
  preenchidos: number;
  emBranco: number;
  /** Fração 0–1 (= preenchidos / linhas_base); 0 se base vazia (SEERRO). */
  pctPreenchimento: number;
};

/** Payload consumido pela tela. */
export type AnaliseQualidadeDados = {
  linhasBase: number;
  indicadores: IndicadorQualidade[];
  campos: CampoPreenchimento[];
};

/** Agregado bruto retornado pela RPC `qualidade_dados_analise`. */
export type AgregadoQualidadeDados = {
  linhas_base?: number | null;
  indicadores?: Array<{
    indicador?: string | null;
    quantidade?: number | null;
    impacto?: string | null;
  }> | null;
  campos?: Array<{
    campo?: string | null;
    preenchidos?: number | null;
  }> | null;
};

function num(valor: number | null | undefined): number {
  return Number(valor ?? 0);
}

/** Equivale a SEERRO(quantidade / linhas_base; 0). */
export function pctDaBase(quantidade: number, linhasBase: number): number {
  if (!Number.isFinite(quantidade) || !Number.isFinite(linhasBase) || linhasBase <= 0) {
    return 0;
  }
  return quantidade / linhasBase;
}

/** Percentual 0–1 → texto pt-BR (ex.: 9,5%). */
export function formatarPctQualidade(valor: number): string {
  if (!Number.isFinite(valor)) return "0%";
  return `${(valor * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

/** Largura da barra (0–100), coerente com o percentual exibido. */
export function larguraBarraPct(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  if (valor >= 1) return 100;
  return valor * 100;
}

/**
 * Monta o objeto da tela a partir do agregado do banco.
 * `% da base` e `% preenchimento` usam sempre `linhas_base` como denominador.
 * `Em branco` = linhas_base − preenchidos (equivalente a COUNTBLANK).
 */
export function montarAnaliseQualidadeDados(
  agregado: AgregadoQualidadeDados | null | undefined,
): AnaliseQualidadeDados {
  const linhasBase = num(agregado?.linhas_base);

  const indicadores: IndicadorQualidade[] = (agregado?.indicadores ?? []).map((item) => {
    const quantidade = num(item.quantidade);
    return {
      indicador: String(item.indicador ?? ""),
      quantidade,
      pctBase: pctDaBase(quantidade, linhasBase),
      impacto: String(item.impacto ?? ""),
    };
  });

  const campos: CampoPreenchimento[] = (agregado?.campos ?? []).map((item) => {
    const preenchidos = num(item.preenchidos);
    const emBranco = Math.max(0, linhasBase - preenchidos);
    return {
      campo: String(item.campo ?? ""),
      preenchidos,
      emBranco,
      pctPreenchimento: pctDaBase(preenchidos, linhasBase),
    };
  });

  return { linhasBase, indicadores, campos };
}
