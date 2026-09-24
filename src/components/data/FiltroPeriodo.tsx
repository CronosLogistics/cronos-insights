import { useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MESES_OPCOES } from "@/lib/filtro-periodo";
import {
  FRETE_TODOS,
  definirModalidadeFrete,
  useModalidadeFrete,
} from "@/lib/modalidade-frete";
import { getModalidadesFrete } from "@/lib/modalidade-frete-fn";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type Opcao = { valor: number; rotulo: string };

function FiltroMultiNumero({
  label,
  placeholder,
  opcoes,
  value,
  onValueChange,
  carregando = false,
}: {
  label: string;
  placeholder: string;
  opcoes: Opcao[];
  value: number[];
  onValueChange: (valor: number[]) => void;
  carregando?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [largura, setLargura] = useState<number>();
  const ancoraRef = useRef<HTMLDivElement>(null);
  const selecionados = useMemo(() => new Set(value), [value]);

  const texto =
    value.length === 0
      ? placeholder
      : value
          .map((v) => opcoes.find((o) => o.valor === v)?.rotulo ?? String(v))
          .join(", ");

  function abrir() {
    setLargura(ancoraRef.current?.offsetWidth);
    setAberto(true);
  }

  function alternar(item: number) {
    if (selecionados.has(item)) {
      onValueChange(value.filter((v) => v !== item));
    } else {
      onValueChange([...value, item].sort((a, b) => a - b));
    }
  }

  if (carregando) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverAnchor asChild>
          <div ref={ancoraRef} className="relative w-full">
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={aberto}
              onClick={abrir}
              className={cn(
                "h-9 w-full justify-between font-normal",
                value.length === 0 && "text-muted-foreground",
                value.length > 0 && "pr-16",
              )}
            >
              <span className="truncate">{texto}</span>
              <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
            </Button>
            {value.length > 0 ? (
              <button
                type="button"
                aria-label={`Limpar ${label}`}
                className="absolute right-8 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation();
                  onValueChange([]);
                }}
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="p-0"
          style={{ width: largura }}
          align="start"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Command>
            <CommandList>
              <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
              <CommandGroup>
                {opcoes.map((opcao) => {
                  const marcado = selecionados.has(opcao.valor);
                  return (
                    <CommandItem
                      key={opcao.valor}
                      value={`${opcao.rotulo} ${opcao.valor}`}
                      onSelect={() => alternar(opcao.valor)}
                      className="gap-2"
                    >
                      <Check
                        className={cn(
                          "size-3.5 shrink-0",
                          marcado ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{opcao.rotulo}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Dois filtros independentes: Ano e Mês (seleção múltipla, opcional). */
export function FiltroPeriodo({
  anos,
  meses,
  onAnosChange,
  onMesesChange,
  anosOpcoes,
  carregando = false,
  className,
  semTipoFrete = false,
}: {
  anos: number[];
  meses: number[];
  onAnosChange: (valor: number[]) => void;
  onMesesChange: (valor: number[]) => void;
  /** Lista de anos disponíveis; se vazia, não mostra opções até carregar. */
  anosOpcoes: number[];
  carregando?: boolean;
  className?: string;
  /** Oculta o tipo de frete em telas que ainda não o aplicam. */
  semTipoFrete?: boolean;
}) {
  const opcoesAno = useMemo(
    () => anosOpcoes.map((y) => ({ valor: y, rotulo: String(y) })),
    [anosOpcoes],
  );

  return (
    <div className={cn("grid gap-3", semTipoFrete ? "sm:grid-cols-2" : "sm:grid-cols-3", className)}>
      <FiltroMultiNumero
        label="Ano"
        placeholder="Todos os anos"
        opcoes={opcoesAno}
        value={anos}
        onValueChange={onAnosChange}
        carregando={carregando}
      />
      <FiltroMultiNumero
        label="Mês"
        placeholder="Todos os meses"
        opcoes={[...MESES_OPCOES]}
        value={meses}
        onValueChange={onMesesChange}
        carregando={carregando}
      />
      {semTipoFrete ? null : <FiltroTipoFrete />}
    </div>
  );
}

/** Tipo de frete: opções vêm apenas das modalidades do usuário. */
export function FiltroTipoFrete() {
  const valor = useModalidadeFrete();
  const opcoes = useQuery({
    queryKey: ["modalidades-frete"],
    queryFn: () => getModalidadesFrete(),
    staleTime: 10 * 60 * 1000,
  });
  const lista = opcoes.data ?? [];
  const valorValido = valor === FRETE_TODOS || lista.includes(valor) ? valor : FRETE_TODOS;

  if (opcoes.isPending) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Tipo de frete</p>
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">Tipo de frete</p>
      <Select value={valorValido} onValueChange={definirModalidadeFrete}>
        <SelectTrigger className="h-9 w-full" aria-label="Tipo de frete">
          <SelectValue placeholder="Todos os tipos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FRETE_TODOS}>Todos os tipos</SelectItem>
          {lista.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
