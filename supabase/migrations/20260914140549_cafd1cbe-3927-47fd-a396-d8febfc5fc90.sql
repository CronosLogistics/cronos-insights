-- 1. Produtos (dimensão padronizada)
create table public.produtos (
  codigo text primary key,
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.produtos to authenticated;
grant all on public.produtos to service_role;

alter table public.produtos enable row level security;

create policy "Autenticados podem consultar produtos"
  on public.produtos for select to authenticated using (true);

insert into public.produtos (codigo, nome) values
  ('IM', 'Importação Marítima'),
  ('EM', 'Exportação Marítima'),
  ('IA', 'Importação Aérea'),
  ('EA', 'Exportação Aérea'),
  ('IR', 'Importação Rodoviária'),
  ('CA', 'Carga Aérea Consolidada'),
  ('S&A - IM', 'S&A - Importação Marítima');

-- 2. Papéis
create type public.app_role as enum ('admin', 'usuario');

create table public.papeis_usuario (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.papeis_usuario to authenticated;
grant all on public.papeis_usuario to service_role;

alter table public.papeis_usuario enable row level security;

create or replace function public.tem_papel(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.papeis_usuario
    where user_id = _user_id and role = _role
  );
$$;

create policy "Usuario ve seus papeis"
  on public.papeis_usuario for select to authenticated
  using (user_id = auth.uid() or public.tem_papel(auth.uid(), 'admin'));

create policy "Admin gerencia papeis"
  on public.papeis_usuario for all to authenticated
  using (public.tem_papel(auth.uid(), 'admin'))
  with check (public.tem_papel(auth.uid(), 'admin'));

-- 3. Perfis (usuário -> produto)
create table public.perfis (
  id uuid primary key,
  email text,
  nome text,
  produto_codigo text references public.produtos(codigo),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.perfis to authenticated;
grant all on public.perfis to service_role;

alter table public.perfis enable row level security;

create policy "Usuario ve seu perfil"
  on public.perfis for select to authenticated
  using (id = auth.uid() or public.tem_papel(auth.uid(), 'admin'));

create policy "Usuario atualiza dados basicos do proprio perfil"
  on public.perfis for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and produto_codigo is not distinct from (select p.produto_codigo from public.perfis p where p.id = auth.uid()));

create policy "Admin atualiza qualquer perfil"
  on public.perfis for update to authenticated
  using (public.tem_papel(auth.uid(), 'admin'))
  with check (public.tem_papel(auth.uid(), 'admin'));

create policy "Admin cadastra perfis"
  on public.perfis for insert to authenticated
  with check (public.tem_papel(auth.uid(), 'admin'));

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger perfis_updated_at
  before update on public.perfis
  for each row execute function public.update_updated_at_column();

create trigger produtos_updated_at
  before update on public.produtos
  for each row execute function public.update_updated_at_column();

-- 4. Criação automática do perfil ao criar acesso
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

  insert into public.papeis_usuario (user_id, role)
  values (new.id, 'usuario')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Produto do usuário autenticado (camada central de filtro)
create or replace function public.produto_do_usuario()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select produto_codigo from public.perfis where id = auth.uid();
$$;

grant execute on function public.produto_do_usuario() to authenticated;

-- 6. Filtro obrigatório por produto na origem dos dados
drop policy if exists "Autenticados podem consultar ofertas" on public.ofertas;

create policy "Usuario consulta apenas ofertas do seu produto"
  on public.ofertas for select to authenticated
  using (produto is not null and produto = public.produto_do_usuario());

-- 7. Backfill dos usuários existentes
insert into public.perfis (id, email, nome, produto_codigo)
select u.id, u.email, coalesce(nullif(u.raw_user_meta_data ->> 'nome', ''), u.email), 'IM'
from auth.users u
on conflict (id) do nothing;

insert into public.papeis_usuario (user_id, role)
select u.id, 'usuario' from auth.users u
on conflict do nothing;

insert into public.papeis_usuario (user_id, role)
select u.id, 'admin' from auth.users u
on conflict do nothing;
