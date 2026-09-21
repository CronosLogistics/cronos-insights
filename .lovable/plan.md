# Cadastro de Usuários + acesso por múltiplas modalidades

## O que muda para você

- Nova aba **Usuários** na navegação, visível e acessível **somente para administradores**.
- Nela o administrador cria, edita, ativa/desativa e exclui usuários, e define **uma ou mais
  modalidades** por pessoa (IA, EA, IM, EM).
- Hoje cada pessoa tem **uma** modalidade. Passa a ter várias: quem tiver IA + IM vê, em todas as
  telas (Dashboard, Clientes, Rotas, Coloaders, Agentes, Analistas, Motivos de Perda, Cotações),
  os registros das duas modalidades somados, antes dos filtros de cada tela.
- Usuário inativo continua aparecendo no cadastro, mas não consegue mais consultar dado nenhum.

## Tela Usuários

Mesmo padrão visual das telas atuais (cabeçalho, bloco de pesquisa compacto, tabela, badges,
skeletons, toasts).

- Cabeçalho: "Usuários" / "Gerencie usuários e suas permissões de acesso às modalidades."
- Pesquisa: campo por nome ou e-mail (dinâmico) + filtro de Status (Todos / Ativo / Inativo,
  padrão Todos) + botão "+ Novo usuário".
- Tabela: Nome, E-mail, Modalidades (badges com os códigos), Status (badge Ativo/Inativo), Ações
  (Editar, Ativar/Desativar, Excluir).
- Modal único para Novo/Editar usuário: Nome, E-mail, Modalidades (seleção múltipla), Status.
  Novo usuário nasce Ativo. Validações: nome obrigatório; e-mail obrigatório, formato válido e
  único ("Este e-mail já está cadastrado."); pelo menos uma modalidade ("Selecione pelo menos uma
  modalidade de acesso.") — inclusive na edição de usuário ativo.
- Confirmações: "Deseja realmente desativar este usuário?" e "Excluir usuário? Essa ação não
  poderá ser desfeita." A exclusão remove o acesso da pessoa; nenhum dado histórico de ofertas é
  apagado.
- Mensagens de sucesso exatamente como especificado (criado / atualizado / ativado / desativado /
  permissões atualizadas).
- Estados: skeleton no carregamento, "Nenhum usuário encontrado", "Nenhum usuário corresponde aos
  filtros selecionados." Sem dados fictícios.

## Segurança

- A restrição por modalidade fica no banco, não na tela: nenhuma requisição manipulada devolve
  registros de modalidade não autorizada, e um usuário inativo não recebe registro algum.
- Criar, editar, ativar/desativar e excluir usuários só é executado após o servidor confirmar que
  quem chamou é administrador. Um usuário comum que tente a rota ou a chamada direta é recusado.

## Detalhes técnicos

### Banco
1. Nova tabela `public.perfis_produtos (user_id, produto_codigo)` (relação N‑N, com GRANTs e RLS:
   leitura do próprio vínculo; administração via `tem_papel(auth.uid(),'admin')`).
   Backfill a partir do `perfis.produto_codigo` atual; a coluna antiga permanece (aditivo).
2. Coluna `perfis.ativo boolean not null default true`.
3. Funções `security definer`: `produtos_do_usuario() returns text[]` e `usuario_ativo() returns boolean`.
   `produto_do_usuario()` continua existindo para compatibilidade.
4. RLS de `ofertas`: `produto = any(public.produtos_do_usuario()) and public.usuario_ativo()`.
5. Views públicas e RPCs analíticas passam de `produto = produto_do_usuario()` para
   `produto = any(produtos_do_usuario())` **com re-agregação**: contagens somadas por dimensão e
   contagens de distintos recalculadas sobre as chaves de dimensão — evita duplicar cliente/rota/
   coloader que aparece em mais de uma modalidade. As matviews do schema `analitico` continuam
   agrupadas por produto (performance preservada) e ganham `group by` extra nas funções:
   `dashboard_*`, `rotas_*`, `clientes`/`v_cliente_*`, `coloaders_*`, `agentes_*`, `analistas_*`,
   `motivos_perda_*`, `qualidade_dados_analise`, `v_kpis_geral`, `v_ofertas_mensal`,
   `v_cotacoes_em_analise`.
6. `atualizar_analises()` mantida como ponto único de refresh.

### Backend da administração
Criar usuário no Auth exige chave privilegiada, então o CRUD vive em `src/lib/usuarios-fn.ts`
(server functions com `requireSupabaseAuth` + checagem de papel admin no servidor):
`listarUsuarios`, `criarUsuario` (Auth Admin `createUser` + perfil + vínculos), `atualizarUsuario`,
`definirStatus`, `excluirUsuario`. O cliente privilegiado é importado dentro do handler.

### Frontend
- `src/routes/_authenticated/usuarios.tsx` + item "Usuários" em `src/lib/navigation.ts` filtrado
  por administrador (`usePerfil().isAdmin`), com bloqueio na própria rota para não‑admin.
- `usePerfil` passa a devolver `produtos: string[]` e `ativo`; `AppHeader` mostra os códigos das
  modalidades do acesso. O painel "Acessos e produto" em Configurações passa a apontar para a
  nova tela, sem duplicar CRUD.
- Aviso de "sem produto associado" passa a considerar lista vazia de modalidades.

### Validação
`tsgo --noEmit`, build, e teste autenticado por navegador: CRUD completo, um usuário com duas
modalidades vendo os números somados e um usuário inativo sem acesso.
