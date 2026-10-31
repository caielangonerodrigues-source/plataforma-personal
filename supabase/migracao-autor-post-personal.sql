-- Foto postada por um personal da equipe aparecia com o nome do dono: o post fica na turma do dono
-- (checkins.personal_id), mas agora guarda também quem postou (checkins.autor_id), e o feed mostra
-- o nome e a foto desse personal. Pode rodar mais de uma vez.

alter table public.checkins add column if not exists autor_id uuid references public.personais (user_id) on delete set null;

-- Quem postou é sempre quem está logado (ninguém posta no nome de outro).
create or replace function public.preencher_autor_post() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.personal_id is not null then
    new.autor_id := case when exists (select 1 from personais where user_id = auth.uid()) then auth.uid() else new.personal_id end;
  end if;
  return new;
end;
$$;
drop trigger if exists checkins_autor_post on public.checkins;
create trigger checkins_autor_post before insert on public.checkins
  for each row execute function public.preencher_autor_post();

-- Posts que já existem: o autor é quem enviou a foto para o Storage.
do $$
begin
  update public.checkins c set autor_id = o.owner_id::uuid
    from storage.objects o
   where c.personal_id is not null and c.autor_id is null and c.foto is not null
     and o.bucket_id = 'checkins' and o.name = c.foto
     and exists (select 1 from public.personais p where p.user_id::text = o.owner_id);
exception when undefined_column then
  update public.checkins c set autor_id = o.owner
    from storage.objects o
   where c.personal_id is not null and c.autor_id is null and c.foto is not null
     and o.bucket_id = 'checkins' and o.name = c.foto
     and exists (select 1 from public.personais p where p.user_id = o.owner);
end $$;

-- Nome e avatar de todos os personais da turma (o dono e a equipe), para assinar os posts no feed.
create or replace function public.personais_do_grupo() returns table (user_id uuid, nome text, avatar text)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.nome, p.avatar from personais p
   where coalesce(p.equipe_de, p.user_id) = public.meu_grupo()
$$;
revoke all on function public.personais_do_grupo() from public;
grant execute on function public.personais_do_grupo() to authenticated;
