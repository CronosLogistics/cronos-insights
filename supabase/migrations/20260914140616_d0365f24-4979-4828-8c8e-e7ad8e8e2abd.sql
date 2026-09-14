revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.update_updated_at_column() from public, anon, authenticated;
revoke all on function public.produto_do_usuario() from public, anon;
revoke all on function public.tem_papel(uuid, public.app_role) from public, anon;
grant execute on function public.produto_do_usuario() to authenticated;
grant execute on function public.tem_papel(uuid, public.app_role) to authenticated;
