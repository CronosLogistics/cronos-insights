import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Database, RefreshCw } from "lucide-react";

import { ModuleIntro, TableSkeleton } from "@/components/data/Placeholders";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatarPctQualidade,
  larguraBarraPct,
  type CampoPreenchimento,
  type IndicadorQualidade,
} from "@/lib/data-quality";
import { getQualidadeDados } from "@/lib/data-quality-fn";

export const Route = createFileRoute("/_authenticated/qualidade-dados")({
  head: () => ({
    meta: [
      { title: "Qualidade de Dados — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Preenchimento e consistencia da tabela historica tbHistorico: indicadores de qualidade e preenchimento por campo.",
      },
      { property: "og:title", content: "Qualidade de Dados — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Consistência e preenchimento da base histórica de cotações.",
      },
    ],
  }),
  component: QualidadePage,
});

const inteiro = (valor: number) => valor.toLocaleString("pt-BR");

const COLUNAS_INDICADORES = ["Indicador", "Quantidade", "% da base", "Impacto"];
const COLUNAS_CAMPOS = ["Campo original", "Preenchidos", "Em branco", "% preenchimento"];

function QualidadePage() {
  const analise = useQuery({
    queryKey: ["qualidade-dados"],
    queryFn: () => getQualidadeDados(),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="w-full min-w-0 space-y-6">
      <ModuleIntro
        eyebrow="Diagnóstico"
        title="Qualidade de Dados"
        description="Preenchimento e consistencia da tabela historica tbHistorico"
      />

      {analise.isPending ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <TableSkeleton columns={COLUNAS_INDICADORES} rows={7} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <TableSkeleton columns={COLUNAS_CAMPOS} rows={10} />
            </CardContent>
          </Card>
        </div>
      ) : analise.isError ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <RefreshCw className="size-4" />
          Não foi possível calcular a qualidade dos dados agora.
        </p>
      ) : analise.data ? (
        <ConteudoQualidade
          indicadores={analise.data.indicadores}
          campos={analise.data.campos}
          linhasBase={analise.data.linhasBase}
        />
      ) : null}
    </div>
  );
}

function ConteudoQualidade({
  indicadores,
  campos,
  linhasBase,
}: {
  indicadores: IndicadorQualidade[];
  campos: CampoPreenchimento[];
  linhasBase: number;
}) {
  const vazio = linhasBase === 0;

  return (
    <div className="space-y-6">
      {vazio ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Database className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Nenhuma base histórica disponível</p>
            <p className="max-w-md text-xs text-muted-foreground">
              Não há registros de ofertas para o produto associado ao seu acesso.
              Os indicadores abaixo ficam em zero.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Indicador</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="min-w-[200px]">% da base</TableHead>
                  <TableHead>Impacto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indicadores.map((linha) => (
                  <TableRow key={linha.indicador}>
                    <TableCell className="font-medium">{linha.indicador}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {inteiro(linha.quantidade)}
                    </TableCell>
                    <TableCell>
                      <BarraPct
                        fracao={linha.pctBase}
                        rotulo={formatarPctQualidade(linha.pctBase)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{linha.impacto}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Campo original</TableHead>
                  <TableHead className="text-right">Preenchidos</TableHead>
                  <TableHead className="text-right">Em branco</TableHead>
                  <TableHead className="min-w-[200px]">% preenchimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campos.map((linha) => (
                  <TableRow key={linha.campo}>
                    <TableCell className="font-medium">{linha.campo}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {inteiro(linha.preenchidos)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {inteiro(linha.emBranco)}
                    </TableCell>
                    <TableCell>
                      <BarraPct
                        fracao={linha.pctPreenchimento}
                        rotulo={formatarPctQualidade(linha.pctPreenchimento)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Barra proporcional ao percentual exibido (0% → vazia, 100% → completa).
 * Não inverte o valor: 25% ocupa ~25% da largura.
 */
function BarraPct({ fracao, rotulo }: { fracao: number; rotulo: string }) {
  const largura = larguraBarraPct(fracao);
  return (
    <div className="flex min-w-[160px] items-center gap-3">
      <div
        className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(largura)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={rotulo}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${largura}%` }}
        />
      </div>
      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {rotulo}
      </span>
    </div>
  );
}
