-- Fotos do personal no feed da comunidade (sem contar como check-in).
-- Um post do personal é uma linha de checkins com personal_id preenchido e aluno_id vazio:
-- assim reações e comentários funcionam igual aos check-ins dos alunos.
-- Pode rodar mais de uma vez.

alter table public.checkins alter column aluno_id drop not null;
alter table public.checkins add column if not exists personal_id uuid references public.personais (user_id) on delete cascade;
alter table public.checkins drop constraint if exists checkins_autor_check;
alter table public.checkins add constraint checkins_autor_check check ((aluno_id is null) <> (personal_id is null));
create index if not exists checkins_personal_idx on public.checkins (personal_id, created_at desc) where personal_id is not null;

-- O personal vê os próprios posts; o aluno que participa da comunidade vê os do seu personal.
create or replace function public.pode_ver_post_personal(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from checkins k where k.id = c and k.personal_id is not null and k.personal_id = public.meu_grupo())
$$;

drop policy if exists "turma vê posts do personal" on public.checkins;
create policy "turma vê posts do personal" on public.checkins
  for select using (personal_id is not null and personal_id = public.meu_grupo());
drop policy if exists "personal posta foto" on public.checkins;
create policy "personal posta foto" on public.checkins
  for insert with check (personal_id = auth.uid() and aluno_id is null and treino_id is null and public.eh_personal());
drop policy if exists "personal apaga seu post" on public.checkins;
create policy "personal apaga seu post" on public.checkins
  for delete using (personal_id = auth.uid());

drop policy if exists "turma vê reações do post do personal" on public.curtidas;
create policy "turma vê reações do post do personal" on public.curtidas
  for select using (public.pode_ver_post_personal(checkin_id));
drop policy if exists "reagir ao post do personal" on public.curtidas;
create policy "reagir ao post do personal" on public.curtidas
  for insert with check (user_id = auth.uid() and public.pode_ver_post_personal(checkin_id));

drop policy if exists "turma vê comentários do post do personal" on public.comentarios_checkin;
create policy "turma vê comentários do post do personal" on public.comentarios_checkin
  for select using (public.pode_ver_post_personal(checkin_id));
drop policy if exists "comentar no post do personal" on public.comentarios_checkin;
create policy "comentar no post do personal" on public.comentarios_checkin
  for insert with check (user_id = auth.uid() and public.pode_ver_post_personal(checkin_id));
drop policy if exists "personal apaga comentário no seu post" on public.comentarios_checkin;
create policy "personal apaga comentário no seu post" on public.comentarios_checkin
  for delete using (exists (select 1 from public.checkins k where k.id = checkin_id and k.personal_id = auth.uid()));

-- Fotos: pasta com o id do personal no bucket "checkins".
drop policy if exists "personal envia foto do post" on storage.objects;
create policy "personal envia foto do post" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'checkins' and (storage.foldername(name))[1] = auth.uid()::text and public.eh_personal());
drop policy if exists "turma vê fotos do personal" on storage.objects;
create policy "turma vê fotos do personal" on storage.objects
  for select to authenticated
  using (bucket_id = 'checkins' and (storage.foldername(name))[1] = public.meu_grupo()::text);
drop policy if exists "personal apaga foto do post" on storage.objects;
create policy "personal apaga foto do post" on storage.objects
  for delete to authenticated
  using (bucket_id = 'checkins' and (storage.foldername(name))[1] = auth.uid()::text);
