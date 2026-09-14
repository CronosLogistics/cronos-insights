import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Produto = { codigo: string; nome: string };

/** Lista padronizada de produtos/modalidades cadastrados. */
export function useProdutos() {
  return useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("codigo,nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Produto[];
    },
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Perfil do usuário autenticado: nome, produto associado e papel.
 * O produto é a dimensão que restringe todos os dados exibidos na aplicação —
 * a restrição é aplicada no banco, nas políticas de acesso da base de ofertas.
 */
export function usePerfil() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["perfil", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [perfil, papeis] = await Promise.all([
        supabase
          .from("perfis")
          .select("id,email,nome,produto_codigo,produtos(codigo,nome)")
          .eq("id", userId!)
          .maybeSingle(),
        supabase.from("papeis_usuario").select("role").eq("user_id", userId!),
      ]);
      if (perfil.error) throw perfil.error;

      const produto = (perfil.data?.produtos ?? null) as Produto | null;
      return {
        nome: perfil.data?.nome ?? user?.email ?? "",
        email: perfil.data?.email ?? user?.email ?? "",
        produtoCodigo: perfil.data?.produto_codigo ?? null,
        produtoNome: produto?.nome ?? null,
        isAdmin: (papeis.data ?? []).some((item) => item.role === "admin"),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
