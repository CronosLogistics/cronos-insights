import { Anchor, Container, Plane, PlaneTakeoff, Ship, type LucideIcon } from "lucide-react";

import { usePerfil } from "@/hooks/useProduto";

/**
 * Terminologia dinâmica por modal.
 * As modalidades cadastradas para o usuário definem o vocabulário exibido:
 * marítimo (porto / armador), aéreo (aeroporto / cia. aérea) ou misto (termos neutros).
 */
export type ModalTerminologia = "maritimo" | "aereo" | "misto";

export type Terminologia = {
  modal: ModalTerminologia;
  /** "Porto" | "Aeroporto" | "Terminal" */
  terminal: string;
  terminalMinusculo: string;
  terminaisPlural: string;
  /** Rótulo do parceiro de transporte, ex.: "Coloader / Armador". */
  coloaderLabel: string;
  coloaderLabelMinusculo: string;
  /** Plural usado em títulos, ex.: "Coloaders / Armadores". */
  coloaderPlural: string;
  /** Rótulo curto usado no menu, ex.: "Coloaders" | "Cias. aéreas". */
  coloaderMenu: string;
  /** Ícone do item de menu. */
  coloaderIcone: LucideIcon;
  /** Ícone usado dentro da tela (estado vazio / ficha). */
  coloaderIconeFicha: LucideIcon;
};

const MARITIMO: Terminologia = {
  modal: "maritimo",
  terminal: "Porto",
  terminalMinusculo: "porto",
  terminaisPlural: "portos",
  coloaderLabel: "Coloader / Armador",
  coloaderLabelMinusculo: "coloader / armador",
  coloaderPlural: "Coloaders / Armadores",
};

const AEREO: Terminologia = {
  modal: "aereo",
  terminal: "Aeroporto",
  terminalMinusculo: "aeroporto",
  terminaisPlural: "aeroportos",
  coloaderLabel: "Coloader / Cia. aérea",
  coloaderLabelMinusculo: "coloader / cia. aérea",
  coloaderPlural: "Coloaders / Cias. aéreas",
};

const MISTO: Terminologia = {
  modal: "misto",
  terminal: "Terminal",
  terminalMinusculo: "terminal",
  terminaisPlural: "terminais",
  coloaderLabel: "Coloader / Transportador",
  coloaderLabelMinusculo: "coloader / transportador",
  coloaderPlural: "Coloaders / Transportadores",
};

const CODIGOS_AEREOS = new Set(["IA", "EA"]);
const CODIGOS_MARITIMOS = new Set(["IM", "EM"]);

/** Deriva a terminologia a partir das modalidades liberadas para o usuário. */
export function terminologiaPara(codigos: string[] | undefined): Terminologia {
  const lista = (codigos ?? []).map((codigo) => codigo.trim().toUpperCase());
  const temAereo = lista.some((codigo) => CODIGOS_AEREOS.has(codigo));
  const temMaritimo = lista.some((codigo) => CODIGOS_MARITIMOS.has(codigo));
  if (temAereo && !temMaritimo) return AEREO;
  if (temMaritimo && !temAereo) return MARITIMO;
  return MISTO;
}

/** Terminologia do usuário autenticado. */
export function useTerminologia(): Terminologia {
  const perfil = usePerfil();
  return terminologiaPara(perfil.data?.modalidadesCodigos);
}

/**
 * Substitui marcadores de terminologia em textos estáticos
 * (ex.: "{coloaderPlural}", "{terminaisPlural}").
 */
export function aplicarTerminologia(texto: string, termos: Terminologia): string {
  return texto.replace(/\{(\w+)\}/g, (original, chave: string) => {
    const valor = (termos as unknown as Record<string, string>)[chave];
    return typeof valor === "string" ? valor : original;
  });
}
