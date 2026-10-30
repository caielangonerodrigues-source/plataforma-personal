-- Página /consultoria com escolha do personal: lista todos os personais com a página de venda no ar.
-- Pode rodar mais de uma vez.

create or replace function public.personais_consultoria()
returns table (personal_id uuid, nome text, titulo text, texto text, instagram text, cref text, telefone text, avatar text)
language sql stable security definer set search_path = public as $$
  select user_id, nome, venda_titulo, venda_texto, instagram, cref, telefone, avatar
    from personais where venda_ativa order by created_at
$$;
revoke all on function public.personais_consultoria() from public;
grant execute on function public.personais_consultoria() to anon, authenticated;
