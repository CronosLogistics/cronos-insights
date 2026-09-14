grant select on public.produtos to anon;

create policy "Visitantes podem consultar produtos ativos"
  on public.produtos for select to anon using (ativo);
