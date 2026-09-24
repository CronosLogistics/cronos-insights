import { useSyncExternalStore } from "react";

/** Filtro de tipo de frete (coluna Modalidade da base de ofertas). */
export const FRETE_TODOS = "Todos";

let atual = FRETE_TODOS;
const ouvintes = new Set<() => void>();

export function definirModalidadeFrete(valor: string) {
  atual = valor || FRETE_TODOS;
  ouvintes.forEach((fn) => fn());
}

/** Valor atual compartilhado entre as telas analíticas. */
export function useModalidadeFrete(): string {
  return useSyncExternalStore(
    (fn) => {
      ouvintes.add(fn);
      return () => ouvintes.delete(fn);
    },
    () => atual,
    () => FRETE_TODOS,
  );
}

/** Validação no servidor: texto livre curto; "Todos" quando vazio. */
export function parseModalidadeFrete(valor: unknown): string {
  if (typeof valor !== "string") return FRETE_TODOS;
  const t = valor.trim().slice(0, 80);
  return t === "" ? FRETE_TODOS : t;
}
