/** Filtro de tipo de frete (coluna Modalidade da base de ofertas). */
export const FRETE_TODOS = "Todos";

/** Validação no servidor: texto livre curto; "Todos" quando vazio. */
export function parseModalidadeFrete(valor: unknown): string {
  if (typeof valor !== "string") return FRETE_TODOS;
  const t = valor.trim().slice(0, 80);
  return t === "" ? FRETE_TODOS : t;
}
