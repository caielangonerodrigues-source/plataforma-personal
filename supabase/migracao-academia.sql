-- Academia: grade de aulas, novidades, grupo do WhatsApp, equipes, chat da turma, check-in por QR code
-- lembrete da mensalidade e fotos da tela de entrada. Rode depois do schema.sql (Supabase > SQL Editor > New query > cole tudo > Run).
-- Pode rodar mais de uma vez.

-- ---------------------------------------------------------------------------
-- Grade de aulas (Jump, GAP, Pilates...). O personal edita; os alunos veem.
-- ---------------------------------------------------------------------------

create table if not exists public.aulas_grade (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid() references public.personais (user_id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6), -- 0 = domingo, 1 = segunda ... 6 = sábado
  hora time not null,
  nome text not null check (char_length(trim(nome)) between 1 and 40),
  obs text check (char_length(obs) <= 60), -- ex.: "verificar mural"
  created_at timestamptz not null default now()
);
create index if not exists aulas_grade_personal_idx on public.aulas_grade (personal_id, dia_semana, hora);

alter table public.aulas_grade enable row level security;
drop policy if exists "personal gerencia a grade" on public.aulas_grade;
create policy "personal gerencia a grade" on public.aulas_grade
  for all using (personal_id = auth.uid()) with check (personal_id = auth.uid());
drop policy if exists "aluno vê a grade" on public.aulas_grade;
create policy "aluno vê a grade" on public.aulas_grade
  for select using (personal_id = public.meu_personal());

-- Grade atual da academia (só na primeira vez, se ainda não tiver nenhuma aula).
insert into public.aulas_grade (personal_id, dia_semana, hora, nome, obs)
select p.user_id, g.dia, g.hora::time, g.nome, g.obs
  from (select user_id from public.personais order by created_at limit 1) p
 cross join (values
   (1, '18:10', 'Jump', null), (1, '19:10', 'GAP', null), (1, '20:10', 'Pilates', null),
   (2, '07:30', 'Funcional', null), (2, '09:10', 'Pilates', null), (2, '18:10', 'Aulas variadas', 'Verificar o mural'), (2, '19:10', 'Pump', null),
   (3, '18:10', 'Spinning', null), (3, '19:10', 'SuperJump', null),
   (4, '07:30', 'Localizada', null), (4, '09:10', 'Pilates', null), (4, '18:10', 'Alongamento', null), (4, '19:10', 'Fitdance', null), (4, '20:10', 'Pilates', null)
 ) as g (dia, hora, nome, obs)
 where not exists (select 1 from public.aulas_grade);

-- ---------------------------------------------------------------------------
-- Novidades da academia: novidades, lembretes e informações
-- ---------------------------------------------------------------------------

create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid() references public.personais (user_id) on delete cascade,
  tipo text not null default 'novidade' check (tipo in ('novidade', 'lembrete', 'informacao')),
  titulo text not null check (char_length(trim(titulo)) between 1 and 80),
  texto text check (char_length(texto) <= 1000),
  fixado boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists avisos_personal_idx on public.avisos (personal_id, created_at desc);

alter table public.avisos enable row level security;
drop policy if exists "personal gerencia avisos" on public.avisos;
create policy "personal gerencia avisos" on public.avisos
  for all using (personal_id = auth.uid()) with check (personal_id = auth.uid());
drop policy if exists "aluno vê avisos" on public.avisos;
create policy "aluno vê avisos" on public.avisos
  for select using (personal_id = public.meu_personal());

-- ---------------------------------------------------------------------------
-- Grupo do WhatsApp da academia e código do QR code da recepção
-- ---------------------------------------------------------------------------

alter table public.personais add column if not exists whatsapp_grupo text default 'https://chat.whatsapp.com/CV644r1nksrD2zrsOzdOJh';
alter table public.personais drop constraint if exists personais_whatsapp_grupo_check;
alter table public.personais add constraint personais_whatsapp_grupo_check
  check (whatsapp_grupo ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+$');

alter table public.personais add column if not exists codigo_checkin text;
update public.personais set codigo_checkin = substr(md5(gen_random_uuid()::text), 1, 12) where codigo_checkin is null;
alter table public.personais alter column codigo_checkin set default substr(md5(gen_random_uuid()::text), 1, 12);
create unique index if not exists personais_codigo_checkin_idx on public.personais (codigo_checkin);

-- O aluno não lê a tabela de personais: o link do grupo vem por aqui.
create or replace function public.grupo_whatsapp() returns text
language sql stable security definer set search_path = public as $$
  select whatsapp_grupo from personais where user_id = public.meu_personal()
$$;
grant execute on function public.grupo_whatsapp() to authenticated;

-- Check-in pelo QR code da recepção: um por dia, com o título "Na academia".
-- Devolve 'feito' ou 'ja-feito'; erro se o código não é da academia do aluno.
create or replace function public.checkin_qr(p_codigo text) returns text
language plpgsql security definer set search_path = public as $$
declare
  a record;
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select id, personal_id into a from alunos where user_id = auth.uid() and status <> 'pausado' limit 1;
  if a.id is null then raise exception 'Entre com a conta de aluno.'; end if;
  if not exists (select 1 from personais where user_id = a.personal_id and codigo_checkin = p_codigo) then
    raise exception 'QR code inválido. Peça um novo na recepção.';
  end if;
  if exists (select 1 from checkins where aluno_id = a.id and data = hoje and titulo = 'Na academia') then
    return 'ja-feito';
  end if;
  insert into checkins (aluno_id, data, titulo) values (a.id, hoje, 'Na academia');
  return 'feito';
end;
$$;
revoke all on function public.checkin_qr(text) from public;
grant execute on function public.checkin_qr(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Equipes: o personal monta as equipes e cada dia de treino do aluno vale pontos para a equipe
-- ---------------------------------------------------------------------------

create table if not exists public.equipes (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid() references public.personais (user_id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 1 and 30),
  cor text not null default '#fc4c02' check (cor ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now()
);
alter table public.alunos add column if not exists equipe_id uuid references public.equipes (id) on delete set null;

alter table public.equipes enable row level security;
drop policy if exists "personal gerencia equipes" on public.equipes;
create policy "personal gerencia equipes" on public.equipes
  for all using (personal_id = auth.uid()) with check (personal_id = auth.uid());
drop policy if exists "turma vê equipes" on public.equipes;
create policy "turma vê equipes" on public.equipes
  for select using (personal_id = public.meu_grupo());

-- Membros da turma agora com a equipe de cada um.
drop function if exists public.comunidade_membros();
create function public.comunidade_membros() returns table (id uuid, nome text, avatar text, equipe_id uuid)
language sql stable security definer set search_path = public as $$
  select a.id, a.nome, a.avatar, a.equipe_id from alunos a
   where a.personal_id = auth.uid()
      or (a.comunidade and a.status <> 'pausado' and a.personal_id = public.meu_grupo())
      or a.user_id = auth.uid()
$$;
grant execute on function public.comunidade_membros() to authenticated;

-- ---------------------------------------------------------------------------
-- Chat da turma (quem participa da comunidade e o personal)
-- ---------------------------------------------------------------------------

create table if not exists public.mensagens_turma (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references public.personais (user_id) on delete cascade, -- a turma
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  autor text,                                 -- preenchido pelo banco
  do_personal boolean not null default false, -- idem
  aluno_id uuid references public.alunos (id) on delete cascade, -- idem (para o avatar)
  texto text not null check (char_length(trim(texto)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists mensagens_turma_idx on public.mensagens_turma (personal_id, created_at desc);

-- Turma, nome e avatar vêm do cadastro, não do que o site manda.
create or replace function public.preencher_mensagem() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p text := (select nome from personais where user_id = auth.uid());
begin
  new.user_id := auth.uid();
  new.personal_id := public.meu_grupo();
  new.do_personal := exists (select 1 from personais where user_id = auth.uid());
  new.aluno_id := case when new.do_personal then null else (select id from alunos where user_id = auth.uid() limit 1) end;
  new.autor := coalesce(p, (select nome from alunos where id = new.aluno_id), case when new.do_personal then 'Personal' else 'Aluno' end);
  new.texto := trim(new.texto);
  if new.personal_id is null then raise exception 'Só quem participa da comunidade usa o chat.'; end if;
  return new;
end;
$$;
drop trigger if exists mensagem_autor on public.mensagens_turma;
create trigger mensagem_autor before insert on public.mensagens_turma
  for each row execute function public.preencher_mensagem();

alter table public.mensagens_turma enable row level security;
drop policy if exists "turma lê o chat" on public.mensagens_turma;
create policy "turma lê o chat" on public.mensagens_turma
  for select using (personal_id = public.meu_grupo());
drop policy if exists "turma escreve no chat" on public.mensagens_turma;
create policy "turma escreve no chat" on public.mensagens_turma
  for insert with check (user_id = auth.uid() and personal_id = public.meu_grupo());
drop policy if exists "apagar mensagem" on public.mensagens_turma;
create policy "apagar mensagem" on public.mensagens_turma
  for delete using (user_id = auth.uid() or personal_id = auth.uid());

-- Mensagens novas chegam na hora (Realtime).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'mensagens_turma') then
    alter publication supabase_realtime add table public.mensagens_turma;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Lembrete da mensalidade no celular (a função "notificacoes" usa esta data para não repetir no mesmo dia)
-- ---------------------------------------------------------------------------

alter table public.alunos add column if not exists mensalidade_avisada_em date;

-- ---------------------------------------------------------------------------
-- Fotos da tela de entrada (passam sozinhas, como no Strava). Bucket público: a tela de login é aberta.
-- ---------------------------------------------------------------------------

create table if not exists public.fotos_entrada (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid() references public.personais (user_id) on delete cascade,
  caminho text not null check (caminho ~ '^[0-9a-f-]{36}/[A-Za-z0-9-]+\.jpg$'), -- bucket "entrada": <personal>/<arquivo>.jpg
  titulo text check (char_length(titulo) <= 40),
  texto text check (char_length(texto) <= 90),
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.fotos_entrada enable row level security;
drop policy if exists "todos veem as fotos da entrada" on public.fotos_entrada;
create policy "todos veem as fotos da entrada" on public.fotos_entrada for select using (true);
drop policy if exists "personal gerencia fotos da entrada" on public.fotos_entrada;
create policy "personal gerencia fotos da entrada" on public.fotos_entrada
  for all using (personal_id = auth.uid()) with check (personal_id = auth.uid() and split_part(caminho, '/', 1) = auth.uid()::text);
grant select on public.fotos_entrada to anon;

insert into storage.buckets (id, name, public) values ('entrada', 'entrada', true)
on conflict (id) do nothing;
drop policy if exists "personal envia fotos da entrada" on storage.objects;
create policy "personal envia fotos da entrada" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'entrada' and (storage.foldername(name))[1] = auth.uid()::text and public.eh_personal());
drop policy if exists "personal apaga fotos da entrada" on storage.objects;
create policy "personal apaga fotos da entrada" on storage.objects
  for delete to authenticated
  using (bucket_id = 'entrada' and (storage.foldername(name))[1] = auth.uid()::text);
