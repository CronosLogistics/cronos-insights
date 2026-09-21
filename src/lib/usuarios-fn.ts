import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Modalidades de acesso: o código é comparado com a coluna Produto da base de ofertas. */
export const MODALIDADES = [
  { codigo: "IA", nome: "Importação Aérea" },
  { codigo: "EA", nome: "Exportação Aérea" },
  { codigo: "IM", nome: "Importação Marítima" },
  { codigo: "EM", nome: "Exportação Marítima" },
] as const;

export type UsuarioAdmin = {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  modalidades: string[];
};

type Ctx = { supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }; userId: string };

/** Toda operação administrativa é confirmada no servidor, nunca só na tela. */
async function exigirAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("tem_papel", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Acesso restrito a administradores.");
}

function validar(input: { nome: string; email: string; modalidades: string[] }) {
  const nome = input.nome.trim();
  const email = input.email.trim().toLowerCase();
  const modalidades = [...new Set(input.modalidades)].filter((codigo) =>
    MODALIDADES.some((m) => m.codigo === codigo),
  );
  if (!nome) throw new Error("Informe o nome do usuário.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
  if (modalidades.length === 0) throw new Error("Selecione pelo menos uma modalidade de acesso.");
  return { nome, email, modalidades };
}

async function sincronizarModalidades(
  admin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  userId: string,
  modalidades: string[],
) {
  const { error: remover } = await admin
    .from("perfis_produtos")
    .delete()
    .eq("user_id", userId)
    .not("produto_codigo", "in", `(${modalidades.map((c) => `"${c}"`).join(",")})`);
  if (remover) throw new Error(remover.message);

  const { error: inserir } = await admin
    .from("perfis_produtos")
    .upsert(
      modalidades.map((produto_codigo) => ({ user_id: userId, produto_codigo })),
      { onConflict: "user_id,produto_codigo" },
    );
  if (inserir) throw new Error(inserir.message);
}

export const listarUsuarios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsuarioAdmin[]> => {
    await exigirAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [perfis, vinculos] = await Promise.all([
      supabaseAdmin.from("perfis").select("id,nome,email,ativo").order("nome"),
      supabaseAdmin.from("perfis_produtos").select("user_id,produto_codigo"),
    ]);
    if (perfis.error) throw new Error(perfis.error.message);
    if (vinculos.error) throw new Error(vinculos.error.message);

    const porUsuario = new Map<string, string[]>();
    for (const item of vinculos.data ?? []) {
      const lista = porUsuario.get(item.user_id) ?? [];
      lista.push(item.produto_codigo);
      porUsuario.set(item.user_id, lista);
    }

    return (perfis.data ?? []).map((perfil) => ({
      id: perfil.id,
      nome: perfil.nome ?? "",
      email: perfil.email ?? "",
      ativo: perfil.ativo !== false,
      modalidades: (porUsuario.get(perfil.id) ?? []).sort(),
    }));
  });

export const criarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { nome: string; email: string; modalidades: string[]; ativo: boolean }) => input)
  .handler(async ({ data, context }): Promise<{ senhaTemporaria: string }> => {
    await exigirAdmin(context as unknown as Ctx);
    const { nome, email, modalidades } = validar(data);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const senhaTemporaria = `Cronos@${Math.random().toString(36).slice(2, 10)}`;
    const criado = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senhaTemporaria,
      email_confirm: true,
      user_metadata: { nome, produto_codigo: modalidades[0] },
    });
    if (criado.error) {
      const msg = criado.error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        throw new Error("Este e-mail já está cadastrado.");
      }
      throw new Error(criado.error.message);
    }

    const id = criado.data.user!.id;
    const { error } = await supabaseAdmin
      .from("perfis")
      .upsert({ id, email, nome, ativo: data.ativo !== false, produto_codigo: modalidades[0] });
    if (error) throw new Error(error.message);

    await sincronizarModalidades(supabaseAdmin, id, modalidades);
    return { senhaTemporaria };
  });

export const atualizarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id: string; nome: string; email: string; modalidades: string[]; ativo: boolean }) => input,
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context as unknown as Ctx);
    const { nome, email, modalidades } = validar(data);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const atualizado = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      email,
      user_metadata: { nome, produto_codigo: modalidades[0] },
    });
    if (atualizado.error) {
      const msg = atualizado.error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        throw new Error("Este e-mail já está cadastrado.");
      }
      throw new Error(atualizado.error.message);
    }

    const { error } = await supabaseAdmin
      .from("perfis")
      .update({ nome, email, ativo: data.ativo, produto_codigo: modalidades[0] })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await sincronizarModalidades(supabaseAdmin, data.id, modalidades);
    return { ok: true };
  });

export const definirStatusUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; ativo: boolean }) => input)
  .handler(async ({ data, context }) => {
    await exigirAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.ativo) {
      const { count, error } = await supabaseAdmin
        .from("perfis_produtos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", data.id);
      if (error) throw new Error(error.message);
      if (!count) throw new Error("Selecione pelo menos uma modalidade de acesso.");
    }

    const { error } = await supabaseAdmin
      .from("perfis")
      .update({ ativo: data.ativo })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await exigirAdmin(ctx);
    if (data.id === ctx.userId) throw new Error("Não é possível excluir o próprio acesso.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("perfis_produtos").delete().eq("user_id", data.id);
    await supabaseAdmin.from("papeis_usuario").delete().eq("user_id", data.id);
    await supabaseAdmin.from("perfis").delete().eq("id", data.id);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
