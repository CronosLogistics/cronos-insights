import { useDeferredValue, useMemo } from "react";

/** Listas até este tamanho são exibidas por inteiro; acima disso, só após digitar. */
export const LIMITE_OPCOES_BUSCA = 50;

export type ResultadoBuscaOpcoes = {
  visiveis: string[];
  /** Lista grande e nada digitado: só as opções fixas são exibidas. */
  aguardandoBusca: boolean;
  /** Correspondências encontradas que não foram renderizadas pelo limite. */
  ocultos: number;
  totalOpcoes: number;
};

/**
 * Filtra as opções de um combobox sem renderizar listas enormes de uma vez:
 * em listas grandes, nada além das opções fixas aparece até o usuário digitar,
 * e o resultado é limitado a LIMITE_OPCOES_BUSCA itens.
 */
export function useBuscaOpcoes(
  itens: readonly string[],
  texto: string,
  fixos: readonly string[],
): ResultadoBuscaOpcoes {
  const textoAdiado = useDeferredValue(texto);

  const normalizados = useMemo(() => itens.map((nome) => nome.toLocaleLowerCase("pt-BR")), [itens]);

  return useMemo(() => {
    const conjuntoFixos = new Set(fixos);
    const totalOpcoes = itens.reduce(
      (total, nome) => (conjuntoFixos.has(nome) ? total : total + 1),
      0,
    );
    const termo = textoAdiado.trim().toLocaleLowerCase("pt-BR");
    const listaGrande = totalOpcoes > LIMITE_OPCOES_BUSCA;

    if (!termo) {
      if (!listaGrande) {
        return { visiveis: [...itens], aguardandoBusca: false, ocultos: 0, totalOpcoes };
      }
      return {
        visiveis: itens.filter((nome) => conjuntoFixos.has(nome)),
        aguardandoBusca: true,
        ocultos: 0,
        totalOpcoes,
      };
    }

    const visiveis: string[] = [];
    let encontrados = 0;
    normalizados.forEach((nome, i) => {
      if (!nome.includes(termo)) return;
      encontrados++;
      if (visiveis.length < LIMITE_OPCOES_BUSCA) visiveis.push(itens[i] as string);
    });
    return {
      visiveis,
      aguardandoBusca: false,
      ocultos: encontrados - visiveis.length,
      totalOpcoes,
    };
  }, [itens, normalizados, textoAdiado, fixos]);
}

export function AvisoBuscaOpcoes({ busca }: { busca: ResultadoBuscaOpcoes }) {
  if (busca.aguardandoBusca) {
    return (
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        Digite para pesquisar entre {busca.totalOpcoes.toLocaleString("pt-BR")} opções.
      </p>
    );
  }
  if (busca.ocultos > 0) {
    return (
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        Mostrando {busca.visiveis.length.toLocaleString("pt-BR")} de{" "}
        {(busca.visiveis.length + busca.ocultos).toLocaleString("pt-BR")} resultados. Continue
        digitando para refinar.
      </p>
    );
  }
  return null;
}
