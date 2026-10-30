-- Foto de avatar dos personais da equipe: cada um envia a foto na própria pasta, mas a leitura só liberava
-- a pasta do dono. Agora qualquer pasta de personal da mesma equipe pode ser lida pela turma e pela equipe.
-- Pode rodar mais de uma vez.

create or replace function public.avatar_da_equipe(pasta text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from personais p
     where p.user_id::text = pasta and coalesce(p.equipe_de, p.user_id) = public.meu_grupo()
  )
$$;
revoke all on function public.avatar_da_equipe(text) from public;
grant execute on function public.avatar_da_equipe(text) to authenticated;

drop policy if exists "turma vê avatar do personal" on storage.objects;
create policy "turma vê avatar do personal" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatares' and (
    (storage.foldername(name))[1] = public.meu_grupo()::text
    or (storage.foldername(name))[1] = auth.uid()::text
    or public.avatar_da_equipe((storage.foldername(name))[1])
  ));
