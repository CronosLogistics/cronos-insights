-- 1. Status do usuário
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- 2. Relação N-N usuário x modalidade (produto)
CREATE TABLE IF NOT EXISTS public.perfis_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  produto_codigo text NOT NULL REFERENCES public.produtos(codigo),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, produto_codigo)
);

CREATE INDEX IF NOT EXISTS perfis_produtos_user_idx ON public.perfis_produtos (user_id);

GRANT SELECT ON public.perfis_produtos TO authenticated;
GRANT ALL ON public.perfis_produtos TO service_role;

ALTER TABLE public.perfis_produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario ve seus produtos" ON public.perfis_produtos;
CREATE POLICY "Usuario ve seus produtos"
  ON public.perfis_produtos FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.tem_papel(auth.uid(), 'admin'));

-- 3. Backfill a partir do produto único atual
INSERT INTO public.perfis_produtos (user_id, produto_codigo)
SELECT id, produto_codigo FROM public.perfis
WHERE produto_codigo IS NOT NULL
ON CONFLICT (user_id, produto_codigo) DO NOTHING;

-- 4. Helpers de acesso
CREATE OR REPLACE FUNCTION public.usuario_ativo()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT coalesce((SELECT ativo FROM public.perfis WHERE id = auth.uid()), false);
$$;

CREATE OR REPLACE FUNCTION public.produtos_do_usuario()
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN coalesce((SELECT ativo FROM public.perfis WHERE id = auth.uid()), false)
      THEN coalesce((
        SELECT array_agg(produto_codigo ORDER BY produto_codigo)
        FROM public.perfis_produtos WHERE user_id = auth.uid()
      ), ARRAY[]::text[])
    ELSE ARRAY[]::text[]
  END;
$$;

REVOKE ALL ON FUNCTION public.produtos_do_usuario() FROM public, anon;
REVOKE ALL ON FUNCTION public.usuario_ativo() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.produtos_do_usuario() TO authenticated;
GRANT EXECUTE ON FUNCTION public.usuario_ativo() TO authenticated;

-- 5. RLS da base de ofertas passa a aceitar todas as modalidades do usuário ativo
DROP POLICY IF EXISTS "Usuario consulta apenas ofertas do seu produto" ON public.ofertas;
CREATE POLICY "Usuario consulta ofertas das suas modalidades"
  ON public.ofertas FOR SELECT TO authenticated
  USING (produto IS NOT NULL AND produto = ANY (public.produtos_do_usuario()));

-- 6. Novo acesso criado pelo administrador já nasce vinculado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare
  v_codigo text;
begin
  v_codigo := nullif(new.raw_user_meta_data ->> 'produto_codigo', '');
  if v_codigo is not null and not exists (select 1 from public.produtos where codigo = v_codigo) then
    v_codigo := null;
  end if;

  insert into public.perfis (id, email, nome, produto_codigo)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), new.email),
    v_codigo
  )
  on conflict (id) do nothing;

  if v_codigo is not null then
    insert into public.perfis_produtos (user_id, produto_codigo)
    values (new.id, v_codigo)
    on conflict (user_id, produto_codigo) do nothing;
  end if;

  insert into public.papeis_usuario (user_id, role)
  values (new.id, 'usuario')
  on conflict do nothing;

  return new;
end;
$$;