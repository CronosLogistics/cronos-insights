import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Plus, Power, Search, Trash2, Users } from "lucide-react";

import { ModuleIntro, PanelBlock } from "@/components/data/Placeholders";
import { PaginatedContent, TablePagination, usePaginacao } from "@/components/data/TablePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePerfil } from "@/hooks/useProduto";
import {
  MODALIDADES,
  atualizarUsuario,
  criarUsuario,
  definirStatusUsuario,
  excluirUsuario,
  listarUsuarios,
  type UsuarioAdmin,
} from "@/lib/usuarios-fn";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Cadastro administrativo de usuários e das modalidades de acesso aos dados de Pricing.",
      },
      { property: "og:title", content: "Usuários — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Gerencie usuários e suas permissões de acesso às modalidades.",
      },
    ],
  }),
  component: UsuariosPage,
});

type FormState = {
  id?: string;
  nome: string;
  email: string;
  modalidades: string[];
  ativo: boolean;
  senha: string;
};

const FORM_VAZIO: FormState = { nome: "", email: "", modalidades: [], ativo: true, senha: "" };


function UsuariosPage() {
  const perfil = usePerfil();

  if (perfil.isPending) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!perfil.data?.isAdmin) {
    return (
      <PanelBlock
        title="Acesso restrito"
        description="O cadastro de usuários está disponível apenas para administradores."
      >
        <p className="text-sm text-muted-foreground">
          Solicite a um administrador a alteração do seu cadastro ou das suas modalidades de acesso.
        </p>
      </PanelBlock>
    );
  }

  return <CadastroUsuarios />;
}

function CadastroUsuarios() {
  const queryClient = useQueryClient();
  const listar = useServerFn(listarUsuarios);
  const criar = useServerFn(criarUsuario);
  const atualizar = useServerFn(atualizarUsuario);
  const definirStatus = useServerFn(definirStatusUsuario);
  const excluir = useServerFn(excluirUsuario);

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<"todos" | "ativo" | "inativo">("todos");
  const [form, setForm] = useState<FormState | null>(null);
  const [confirmar, setConfirmar] = useState<
    { tipo: "desativar" | "excluir"; usuario: UsuarioAdmin } | null
  >(null);

  const usuarios = useQuery({
    queryKey: ["usuarios-admin"],
    queryFn: () => listar({ data: undefined }),
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (usuarios.data ?? []).filter((usuario) => {
      const combinaTermo =
        !termo ||
        usuario.nome.toLowerCase().includes(termo) ||
        usuario.email.toLowerCase().includes(termo);
      const combinaStatus =
        status === "todos" || (status === "ativo" ? usuario.ativo : !usuario.ativo);
      return combinaTermo && combinaStatus;
    });
  }, [usuarios.data, busca, status]);

  const paginacao = usePaginacao(filtrados, `usuarios-${busca}-${status}`);

  async function recarregar() {
    await queryClient.invalidateQueries({ queryKey: ["usuarios-admin"] });
    await queryClient.invalidateQueries({ queryKey: ["perfil"] });
  }

  const salvar = useMutation({
    mutationFn: async (valores: FormState) => {
      if (valores.modalidades.length === 0) {
        throw new Error("Selecione pelo menos uma modalidade de acesso.");
      }
      if (valores.id) {
        await atualizar({
          data: {
            id: valores.id,
            nome: valores.nome,
            email: valores.email,
            modalidades: valores.modalidades,
            ativo: valores.ativo,
          },
        });
        return { tipo: "edicao" as const };
      }
      const criado = await criar({
        data: {
          nome: valores.nome,
          email: valores.email,
          modalidades: valores.modalidades,
          ativo: valores.ativo,
        },
      });
      return { tipo: "criacao" as const, senha: criado.senhaTemporaria };
    },
    onSuccess: async (resultado) => {
      setForm(null);
      await recarregar();
      if (resultado.tipo === "criacao") {
        toast.success("Usuário criado com sucesso.", {
          description: `Senha provisória para o primeiro acesso: ${resultado.senha}`,
          duration: 12000,
        });
      } else {
        toast.success("Usuário atualizado com sucesso.");
        toast.success("Permissões de acesso atualizadas com sucesso.");
      }
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  const alterarStatus = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      await definirStatus({ data: { id, ativo } });
      return ativo;
    },
    onSuccess: async (ativo) => {
      setConfirmar(null);
      await recarregar();
      toast.success(ativo ? "Usuário ativado com sucesso." : "Usuário desativado com sucesso.");
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => excluir({ data: { id } }),
    onSuccess: async () => {
      setConfirmar(null);
      await recarregar();
      toast.success("Usuário excluído com sucesso.");
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  const temFiltro = busca.trim().length > 0 || status !== "todos";

  return (
    <div className="space-y-6">
      <ModuleIntro
        eyebrow="Administração"
        title="Usuários"
        description="Gerencie usuários e suas permissões de acesso às modalidades."
      />

      <div className="grid gap-3 rounded-lg border border-border bg-card px-3 py-2.5 lg:grid-cols-[1.4fr_0.6fr_auto] lg:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Pesquisar usuário"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(valor) => setStatus(valor as typeof status)}>
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
        <Button className="gap-2" onClick={() => setForm({ ...FORM_VAZIO })}>
          <Plus className="size-4" />
          Novo usuário
        </Button>
      </div>

      <PanelBlock
        title="Usuários cadastrados"
        description="As modalidades definem quais registros da base de ofertas cada pessoa consulta."
        action={
          <Badge variant="outline" className="gap-1 border-accent/40 text-accent">
            <Users className="size-3" />
            {(usuarios.data ?? []).length.toLocaleString("pt-BR")}
          </Badge>
        }
      >
        {usuarios.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <>
            <PaginatedContent
              pageKey={paginacao.pageKey}
              direction={paginacao.transicao}
              className="overflow-x-auto"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Modalidades</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginacao.visiveis.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="max-w-[220px] truncate">
                        {usuario.nome || "—"}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate">
                        {usuario.email || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {usuario.modalidades.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            usuario.modalidades.map((codigo) => (
                              <Badge key={codigo} variant="secondary" className="font-normal">
                                {codigo}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            usuario.ativo
                              ? "border-accent/40 text-accent"
                              : "border-muted text-muted-foreground"
                          }
                        >
                          {usuario.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Ações do usuário">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() =>
                                setForm({
                                  id: usuario.id,
                                  nome: usuario.nome,
                                  email: usuario.email,
                                  modalidades: [...usuario.modalidades],
                                  ativo: usuario.ativo,
                                })
                              }
                            >
                              <Pencil className="mr-2 size-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                if (usuario.ativo) {
                                  setConfirmar({ tipo: "desativar", usuario });
                                } else {
                                  alterarStatus.mutate({ id: usuario.id, ativo: true });
                                }
                              }}
                            >
                              <Power className="mr-2 size-4" />
                              {usuario.ativo ? "Desativar usuário" : "Ativar usuário"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => setConfirmar({ tipo: "excluir", usuario })}
                            >
                              <Trash2 className="mr-2 size-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginacao.total === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {temFiltro
                          ? "Nenhum usuário corresponde aos filtros selecionados."
                          : "Nenhum usuário encontrado"}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </PaginatedContent>
            <TablePagination
              pagina={paginacao.pagina}
              totalPaginas={paginacao.totalPaginas}
              porPagina={paginacao.porPagina}
              total={paginacao.total}
              inicio={paginacao.inicio}
              onPagina={paginacao.setPagina}
              onPorPagina={paginacao.setPorPagina}
            />
          </>
        )}
      </PanelBlock>

      <Dialog open={form !== null} onOpenChange={(aberto) => (aberto ? null : setForm(null))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar usuário" : "Novo usuário"}</DialogTitle>
            <DialogDescription>
              As modalidades selecionadas definem quais registros da base de ofertas o usuário
              consulta em todas as telas.
            </DialogDescription>
          </DialogHeader>

          {form ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="usuario-nome">Nome</Label>
                <Input
                  id="usuario-nome"
                  value={form.nome}
                  onChange={(event) => setForm({ ...form, nome: event.target.value })}
                  placeholder="Nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usuario-email">E-mail</Label>
                <Input
                  id="usuario-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="nome@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Modalidades de acesso</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {MODALIDADES.map((modalidade) => {
                    const marcada = form.modalidades.includes(modalidade.codigo);
                    return (
                      <label
                        key={modalidade.codigo}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                      >
                        <Checkbox
                          checked={marcada}
                          onCheckedChange={(valor) =>
                            setForm({
                              ...form,
                              modalidades: valor
                                ? [...form.modalidades, modalidade.codigo]
                                : form.modalidades.filter((c) => c !== modalidade.codigo),
                            })
                          }
                        />
                        <span className="font-medium">{modalidade.codigo}</span>
                        <span className="text-muted-foreground">{modalidade.nome}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.ativo ? "ativo" : "inativo"}
                  onValueChange={(valor) => setForm({ ...form, ativo: valor === "ativo" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button
              disabled={salvar.isPending}
              onClick={() => (form ? salvar.mutate(form) : null)}
            >
              {form?.id ? "Salvar alterações" : "Cadastrar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmar !== null}
        onOpenChange={(aberto) => (aberto ? null : setConfirmar(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmar?.tipo === "excluir"
                ? "Excluir usuário?"
                : "Deseja realmente desativar este usuário?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmar?.tipo === "excluir"
                ? "Essa ação não poderá ser desfeita. O histórico de ofertas não é afetado."
                : "O usuário deixa de acessar a aplicação e os dados, mas continua no cadastro."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmar) return;
                if (confirmar.tipo === "excluir") {
                  remover.mutate(confirmar.usuario.id);
                } else {
                  alterarStatus.mutate({ id: confirmar.usuario.id, ativo: false });
                }
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
