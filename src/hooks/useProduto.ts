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
 * Perfil do usuário autenticado: nome, modalidades liberadas, status e papel.
 * As modalidades são a dimensão que restringe todos os dados exibidos —
 * a restrição é aplicada no banco, nas políticas de acesso da base de ofertas.
 */
export function usePerfil() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["perfil", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [perfil, vinculos, papeis] = await Promise.all([
        supabase
          .from("perfis")
          .select("id,email,nome,ativo,produto_codigo")
          .eq("id", userId!)
          .maybeSingle(),
        supabase
          .from("perfis_produtos")
          .select("produto_codigo,produtos(codigo,nome)")
          .eq("user_id", userId!),
        supabase.from("papeis_usuario").select("role").eq("user_id", userId!),
      ]);
      if (perfil.error) throw perfil.error;

      const modalidades = (vinculos.data ?? [])
        .map((item) => ({
          codigo: item.produto_codigo,
          nome: (item.produtos as Produto | null)?.nome ?? item.produto_codigo,
        }))
        .sort((a, b) => a.codigo.localeCompare(b.codigo));

      return {
        nome: perfil.data?.nome ?? user?.email ?? "",
        email: perfil.data?.email ?? user?.email ?? "",
        ativo: perfil.data?.ativo !== false,
        modalidades,
        modalidadesCodigos: modalidades.map((item) => item.codigo),
        /** Compatibilidade com telas que ainda leem um único produto. */
        produtoCodigo: modalidades[0]?.codigo ?? perfil.data?.produto_codigo ?? null,
        produtoNome: modalidades[0]?.nome ?? null,
        isAdmin: (papeis.data ?? []).some((item) => item.role === "admin"),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
