import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Database, RefreshCw } from "lucide-react";

import { FiltroPeriodo } from "@/components/data/FiltroPeriodo";
import { FRETE_TODOS } from "@/lib/modalidade-frete";

import { ModuleIntro, TableSkeleton } from "@/components/data/Placeholders";
import { BotaoExportarTabela } from "@/components/data/table-export";
import {
  CabecalhoOrdenavel,
  useOrdenacaoTabela,
  type ColunasOrdenacao,
} from "@/components/data/table-sort";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
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
import { gerarAnosOpcoes } from "@/lib/filtro-periodo";

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

const COLUNAS_INDICADORES_LABELS = ["Indicador", "Quantidade", "% da base", "Impacto"];
const COLUNAS_CAMPOS_LABELS = ["Campo original", "Preenchidos", "Em branco", "% preenchimento"];

const COLUNAS_INDICADORES: ColunasOrdenacao<IndicadorQualidade> = {
  indicador: { tipo: "texto" },
  quantidade: { tipo: "numero" },
  pctBase: { tipo: "numero" },
  impacto: { tipo: "texto" },
};

const COLUNAS_CAMPOS: ColunasOrdenacao<CampoPreenchimento> = {
  campo: { tipo: "texto" },
  preenchidos: { tipo: "numero" },
  emBranco: { tipo: "numero" },
  pctPreenchimento: { tipo: "numero" },
};

function QualidadePage() {
  const [anos, setAnos] = useState<number[]>([]);
  const [meses, setMeses] = useState<number[]>([]);
  const [modalidade, setModalidade] = useState(FRETE_TODOS);
  const anosOpcoes = useMemo(() => gerarAnosOpcoes(), []);

  const analise = useQuery({
    queryKey: ["qualidade-dados", anos, meses, modalidade],
    queryFn: () => getQualidadeDados({ data: { anos, meses, modalidade } }),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="w-full min-w-0 space-y-6">
      <ModuleIntro
        eyebrow="Diagnóstico"
        title="Qualidade de Dados"
        description="Preenchimento e consistencia da tabela historica tbHistorico"
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Filtros
          </p>
          <FiltroPeriodo
            anos={anos}
            meses={meses}
            onAnosChange={setAnos}
            onMesesChange={setMeses}
            anosOpcoes={anosOpcoes}
            modalidade={modalidade}
            onModalidadeChange={setModalidade}
            className="w-full md:w-1/2"
          />
        </CardContent>
      </Card>

      {analise.isPending && !analise.data ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <TableSkeleton columns={COLUNAS_INDICADORES_LABELS} rows={7} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <TableSkeleton columns={COLUNAS_CAMPOS_LABELS} rows={10} />
            </CardContent>
          </Card>
        </div>
      ) : analise.isError && !analise.data ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <RefreshCw className="size-4" />
          Não foi possível calcular a qualidade dos dados agora.
        </p>
      ) : analise.data ? (
        <div className={analise.isFetching ? "opacity-70 transition-opacity" : undefined}>
          <ConteudoQualidade
            indicadores={analise.data.indicadores}
            campos={analise.data.campos}
            linhasBase={analise.data.linhasBase}
          />
        </div>
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
  const {
    ordenadas: indicadoresOrd,
    ordenacao: ordenacaoInd,
    alternar: alternarInd,
  } = useOrdenacaoTabela(indicadores, COLUNAS_INDICADORES);
  const {
    ordenadas: camposOrd,
    ordenacao: ordenacaoCampos,
    alternar: alternarCampos,
  } = useOrdenacaoTabela(campos, COLUNAS_CAMPOS);

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
        <CardContent className="space-y-3 pt-6">
          <BotaoExportarTabela
            nomeArquivo="qualidade-indicadores"
            colunas={[
              { rotulo: "Indicador", valor: (l) => l.indicador },
              { rotulo: "Quantidade", valor: (l) => l.quantidade },
              { rotulo: "% da base", valor: (l) => l.pctBase },
              { rotulo: "Impacto", valor: (l) => l.impacto },
            ]}
            linhas={indicadoresOrd}
          />
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <CabecalhoOrdenavel
                    label="Indicador"
                    coluna="indicador"
                    ordenacao={ordenacaoInd}
                    onOrdenar={alternarInd}
                  />
                  <CabecalhoOrdenavel
                    label="Quantidade"
                    coluna="quantidade"
                    ordenacao={ordenacaoInd}
                    onOrdenar={alternarInd}
                    align="right"
                  />
                  <CabecalhoOrdenavel
                    label="% da base"
                    coluna="pctBase"
                    ordenacao={ordenacaoInd}
                    onOrdenar={alternarInd}
                    className="min-w-[200px]"
                  />
                  <CabecalhoOrdenavel
                    label="Impacto"
                    coluna="impacto"
                    ordenacao={ordenacaoInd}
                    onOrdenar={alternarInd}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {indicadoresOrd.map((linha) => (
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
        <CardContent className="space-y-3 pt-6">
          <BotaoExportarTabela
            nomeArquivo="qualidade-campos"
            colunas={[
              { rotulo: "Campo original", valor: (l) => l.campo },
              { rotulo: "Preenchidos", valor: (l) => l.preenchidos },
              { rotulo: "Em branco", valor: (l) => l.emBranco },
              { rotulo: "% preenchimento", valor: (l) => l.pctPreenchimento },
            ]}
            linhas={camposOrd}
          />
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <CabecalhoOrdenavel
                    label="Campo original"
                    coluna="campo"
                    ordenacao={ordenacaoCampos}
                    onOrdenar={alternarCampos}
                  />
                  <CabecalhoOrdenavel
                    label="Preenchidos"
                    coluna="preenchidos"
                    ordenacao={ordenacaoCampos}
                    onOrdenar={alternarCampos}
                    align="right"
                  />
                  <CabecalhoOrdenavel
                    label="Em branco"
                    coluna="emBranco"
                    ordenacao={ordenacaoCampos}
                    onOrdenar={alternarCampos}
                    align="right"
                  />
                  <CabecalhoOrdenavel
                    label="% preenchimento"
                    coluna="pctPreenchimento"
                    ordenacao={ordenacaoCampos}
                    onOrdenar={alternarCampos}
                    className="min-w-[200px]"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {camposOrd.map((linha) => (
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
