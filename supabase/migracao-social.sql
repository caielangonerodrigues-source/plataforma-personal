-- Rede social e motivação: reações com emoji (posts e chat) e lembretes de motivação para quem está sumido.
-- Pode rodar mais de uma vez.

-- ---------------------------------------------------------------------------
-- Reações nos posts: cada pessoa escolhe um emoji por post (as curtidas antigas viram ❤️).
-- ---------------------------------------------------------------------------

alter table public.curtidas add column if not exists emoji text not null default '❤️';
alter table public.curtidas drop constraint if exists curtidas_emoji_check;
alter table public.curtidas add constraint curtidas_emoji_check check (emoji in ('❤️', '🔥', '💪', '👏', '😂', '😮'));

drop policy if exists "trocar reação" on public.curtidas;
create policy "trocar reação" on public.curtidas
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Reações nas mensagens do chat da turma (uma por pessoa em cada mensagem).
-- ---------------------------------------------------------------------------

create table if not exists public.reacoes_mensagem (
  mensagem_id uuid not null references public.mensagens_turma (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  emoji text not null check (emoji in ('❤️', '🔥', '💪', '👏', '😂', '😮')),
  created_at timestamptz not null default now(),
  primary key (mensagem_id, user_id)
);

create or replace function public.turma_da_mensagem(m uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select personal_id from mensagens_turma where id = m
$$;

alter table public.reacoes_mensagem enable row level security;
drop policy if exists "turma vê reações" on public.reacoes_mensagem;
create policy "turma vê reações" on public.reacoes_mensagem
  for select using (public.turma_da_mensagem(mensagem_id) = public.meu_grupo());
drop policy if exists "reagir" on public.reacoes_mensagem;
create policy "reagir" on public.reacoes_mensagem
  for insert with check (user_id = auth.uid() and public.turma_da_mensagem(mensagem_id) = public.meu_grupo());
drop policy if exists "trocar reação da mensagem" on public.reacoes_mensagem;
create policy "trocar reação da mensagem" on public.reacoes_mensagem
  for update using (user_id = auth.uid()) with check (user_id = auth.uid() and public.turma_da_mensagem(mensagem_id) = public.meu_grupo());
drop policy if exists "tirar reação" on public.reacoes_mensagem;
create policy "tirar reação" on public.reacoes_mensagem
  for delete using (user_id = auth.uid());

-- Reações chegam na hora no chat (Realtime).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'reacoes_mensagem') then
    alter publication supabase_realtime add table public.reacoes_mensagem;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Motivação: notificação para quem está sem treinar há 3, 7, 14, 21 ou 30 dias.
-- ---------------------------------------------------------------------------

alter table public.alunos add column if not exists motivacao_avisada_em date;
alter table public.personais add column if not exists motivacao_auto boolean not null default true;

-- ---------------------------------------------------------------------------
-- Card do treino no post (exercícios, volume, recordes) ou de corrida/bike/caminhada (km, tempo).
-- ---------------------------------------------------------------------------

alter table public.checkins add column if not exists resumo jsonb;
alter table public.checkins drop constraint if exists checkins_resumo_check;
alter table public.checkins add constraint checkins_resumo_check
  check (resumo is null or (jsonb_typeof(resumo) = 'object' and resumo->>'tipo' in ('treino', 'cardio') and pg_column_size(resumo) < 2000));

-- ---------------------------------------------------------------------------
-- Conquistas no feed: medalhas e recordes de carga viram post sozinhos.
-- ---------------------------------------------------------------------------

create table if not exists public.conquistas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  chave text not null check (char_length(chave) <= 120),  -- ex.: medalha:dez, recorde:<exercício>:<dia>
  tipo text not null check (tipo in ('medalha', 'recorde')),
  icone text check (char_length(icone) <= 8),
  titulo text not null check (char_length(titulo) <= 80),
  texto text check (char_length(texto) <= 140),
  visivel boolean not null default true,  -- as antigas (da primeira vez) ficam só no perfil
  created_at timestamptz not null default now(),
  unique (aluno_id, chave)
);
create index if not exists conquistas_recentes_idx on public.conquistas (created_at desc);

alter table public.conquistas enable row level security;
drop policy if exists "turma vê conquistas" on public.conquistas;
create policy "turma vê conquistas" on public.conquistas
  for select using (public.pode_ver_checkin(aluno_id));
drop policy if exists "aluno registra conquista" on public.conquistas;
create policy "aluno registra conquista" on public.conquistas
  for insert with check (public.eh_o_aluno(aluno_id));
drop policy if exists "apagar conquista" on public.conquistas;
create policy "apagar conquista" on public.conquistas
  for delete using (public.eh_o_aluno(aluno_id) or public.dono_do_aluno(aluno_id));

-- Reações nas conquistas (parabéns da turma).
create table if not exists public.reacoes_conquista (
  conquista_id uuid not null references public.conquistas (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  emoji text not null check (emoji in ('❤️', '🔥', '💪', '👏', '😂', '😮')),
  created_at timestamptz not null default now(),
  primary key (conquista_id, user_id)
);

create or replace function public.aluno_da_conquista(c uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select aluno_id from conquistas where id = c
$$;

alter table public.reacoes_conquista enable row level security;
drop policy if exists "turma vê reações das conquistas" on public.reacoes_conquista;
create policy "turma vê reações das conquistas" on public.reacoes_conquista
  for select using (public.pode_ver_checkin(public.aluno_da_conquista(conquista_id)));
drop policy if exists "reagir à conquista" on public.reacoes_conquista;
create policy "reagir à conquista" on public.reacoes_conquista
  for insert with check (user_id = auth.uid() and public.pode_ver_checkin(public.aluno_da_conquista(conquista_id)));
drop policy if exists "trocar reação da conquista" on public.reacoes_conquista;
create policy "trocar reação da conquista" on public.reacoes_conquista
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "tirar reação da conquista" on public.reacoes_conquista;
create policy "tirar reação da conquista" on public.reacoes_conquista
  for delete using (user_id = auth.uid());
