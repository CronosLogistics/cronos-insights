import { ChevronDown, Download } from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ColunaExportacao<T> = {
  rotulo: string;
  valor: (linha: T) => string | number | boolean | null | undefined;
};

function celulaTexto(valor: string | number | boolean | null | undefined): string {
  if (valor == null) return "";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  return String(valor);
}

function celulaPlanilha(valor: string | number | boolean | null | undefined): string | number {
  if (valor == null) return "";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  return String(valor);
}

function montarMatriz<T>(colunas: ColunaExportacao<T>[], linhas: readonly T[]) {
  const cabecalho = colunas.map((c) => c.rotulo);
  const corpo = linhas.map((linha) => colunas.map((c) => celulaPlanilha(c.valor(linha))));
  return [cabecalho, ...corpo];
}

function escaparCsv(valor: string) {
  if (/[",\r\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

function baixarBlob(conteudo: BlobPart, mime: string, nomeArquivo: string) {
  const blob = new Blob([conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

function nomeBase(nomeArquivo: string) {
  return nomeArquivo.replace(/\.(csv|xlsx)$/i, "").trim() || "exportacao";
}

export function exportarCsv<T>(
  nomeArquivo: string,
  colunas: ColunaExportacao<T>[],
  linhas: readonly T[],
) {
  const matriz = montarMatriz(colunas, linhas);
  const texto = matriz
    .map((linha) => linha.map((celula) => escaparCsv(celulaTexto(celula))).join(";"))
    .join("\r\n");
  // BOM para Excel reconhecer UTF-8
  baixarBlob(`\uFEFF${texto}`, "text/csv;charset=utf-8", `${nomeBase(nomeArquivo)}.csv`);
}

export function exportarXlsx<T>(
  nomeArquivo: string,
  colunas: ColunaExportacao<T>[],
  linhas: readonly T[],
) {
  const matriz = montarMatriz(colunas, linhas);
  const planilha = XLSX.utils.aoa_to_sheet(matriz);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, "Dados");
  const buffer = XLSX.write(livro, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  baixarBlob(
    buffer,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    `${nomeBase(nomeArquivo)}.xlsx`,
  );
}

/** Botão no topo da tabela: exporta o conjunto completo (não só a página atual). */
export function BotaoExportarTabela<T>({
  nomeArquivo,
  colunas,
  linhas,
  disabled,
  className,
}: {
  nomeArquivo: string;
  colunas: ColunaExportacao<T>[];
  linhas: readonly T[];
  disabled?: boolean;
  className?: string;
}) {
  const semDados = linhas.length === 0;
  const inativo = disabled || semDados;

  return (
    <div className={cn("flex justify-end", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            disabled={inativo}
          >
            <Download className="size-3.5" />
            Exportar
            <ChevronDown className="size-3.5 opacity-70" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={inativo}
            onSelect={() => exportarXlsx(nomeArquivo, colunas, linhas)}
          >
            Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={inativo}
            onSelect={() => exportarCsv(nomeArquivo, colunas, linhas)}
          >
            CSV (.csv)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
