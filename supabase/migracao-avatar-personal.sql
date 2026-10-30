-- Avatar do personal (foto ou avatar pronto), para as fotos e comentários dele na comunidade.
-- Pode rodar mais de uma vez.

alter table public.personais add column if not exists avatar text;
alter table public.personais drop constraint if exists personais_avatar_check;
alter table public.personais add constraint personais_avatar_check
  check (avatar ~ '^(p:[0-9]{1,2}|[0-9a-f-]{36}/[A-Za-z0-9-]+\.jpg)$');

-- O personal só muda o próprio avatar (e a foto tem que estar na pasta dele).
create or replace function public.definir_avatar_personal(p_avatar text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v text := nullif(trim(coalesce(p_avatar, '')), '');
begin
  if not public.eh_personal() then raise exception 'Só o personal muda este avatar.'; end if;
  if v is not null and v !~ '^p:[0-9]{1,2}$' and split_part(v, '/', 1) <> auth.uid()::text then
    raise exception 'Avatar inválido.';
  end if;
  update personais set avatar = v where user_id = auth.uid();
end;
$$;
revoke all on function public.definir_avatar_personal(text) from public;
grant execute on function public.definir_avatar_personal(text) to authenticated;

-- Nome e avatar do personal da turma (para o feed): o próprio, se quem pergunta é o personal.
create or replace function public.personal_do_grupo() returns table (nome text, avatar text)
language sql stable security definer set search_path = public as $$
  select nome, avatar from personais where user_id = public.meu_grupo()
$$;
revoke all on function public.personal_do_grupo() from public;
grant execute on function public.personal_do_grupo() to authenticated;

-- Foto do avatar: pasta com o id do personal no bucket "avatares".
drop policy if exists "personal envia avatar" on storage.objects;
create policy "personal envia avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text and public.eh_personal());
drop policy if exists "turma vê avatar do personal" on storage.objects;
create policy "turma vê avatar do personal" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = public.meu_grupo()::text);
drop policy if exists "personal apaga avatar" on storage.objects;
create policy "personal apaga avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
