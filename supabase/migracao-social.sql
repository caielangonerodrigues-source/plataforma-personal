-- Rede social e motivação: reações com emoji, card do treino, conquistas, motivação, vídeos de execução, mensagens com o personal e diário da dieta.
-- Pode rodar mais de uma vez.

-- ---------------------------------------------------------------------------
-- Reações nos posts: cada pessoa escolhe um emoji por post (as curtidas antigas viram ❤️). Qualquer emoji da lista do app.
-- ---------------------------------------------------------------------------

alter table public.curtidas add column if not exists emoji text not null default '❤️';
alter table public.curtidas drop constraint if exists curtidas_emoji_check;
alter table public.curtidas add constraint curtidas_emoji_check check (char_length(emoji) between 1 and 16);

drop policy if exists "trocar reação" on public.curtidas;
create policy "trocar reação" on public.curtidas
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Reações nas mensagens do chat da turma (uma por pessoa em cada mensagem).
-- ---------------------------------------------------------------------------

create table if not exists public.reacoes_mensagem (
  mensagem_id uuid not null references public.mensagens_turma (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (mensagem_id, user_id)
);
alter table public.reacoes_mensagem drop constraint if exists reacoes_mensagem_emoji_check;
alter table public.reacoes_mensagem add constraint reacoes_mensagem_emoji_check check (char_length(emoji) between 1 and 16);

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
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (conquista_id, user_id)
);
alter table public.reacoes_conquista drop constraint if exists reacoes_conquista_emoji_check;
alter table public.reacoes_conquista add constraint reacoes_conquista_emoji_check check (char_length(emoji) between 1 and 16);

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

-- ---------------------------------------------------------------------------
-- Vídeos de execução: o aluno manda o vídeo do exercício e o personal responde com a correção.
-- ---------------------------------------------------------------------------

create table if not exists public.videos_execucao (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  exercicio text not null check (char_length(trim(exercicio)) between 1 and 80),
  caminho text not null check (caminho ~ '^[0-9a-f-]{36}/[A-Za-z0-9-]+\.(mp4|mov|webm|m4v)$'), -- bucket "execucoes": <aluno>/<arquivo>
  comentario text check (char_length(comentario) <= 280),  -- do aluno
  resposta text check (char_length(resposta) <= 1000),      -- do personal
  respondido_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists videos_execucao_idx on public.videos_execucao (aluno_id, created_at desc);

alter table public.videos_execucao enable row level security;
drop policy if exists "aluno e personal veem os vídeos" on public.videos_execucao;
create policy "aluno e personal veem os vídeos" on public.videos_execucao
  for select using (public.eh_o_aluno(aluno_id) or public.dono_do_aluno(aluno_id));
drop policy if exists "aluno manda vídeo" on public.videos_execucao;
create policy "aluno manda vídeo" on public.videos_execucao
  for insert with check (public.eh_o_aluno(aluno_id) and resposta is null and respondido_em is null and split_part(caminho, '/', 1) = aluno_id::text);
drop policy if exists "personal responde o vídeo" on public.videos_execucao;
create policy "personal responde o vídeo" on public.videos_execucao
  for update using (public.dono_do_aluno(aluno_id)) with check (public.dono_do_aluno(aluno_id));
drop policy if exists "apagar vídeo" on public.videos_execucao;
create policy "apagar vídeo" on public.videos_execucao
  for delete using (public.eh_o_aluno(aluno_id) or public.dono_do_aluno(aluno_id));

-- Vídeos de até 50 MB (uns 30 a 60 segundos gravados no celular).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('execucoes', 'execucoes', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "aluno envia vídeo de execução" on storage.objects;
create policy "aluno envia vídeo de execução" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'execucoes' and public.eh_o_aluno(((storage.foldername(name))[1])::uuid));
drop policy if exists "aluno e personal veem vídeo de execução" on storage.objects;
create policy "aluno e personal veem vídeo de execução" on storage.objects
  for select to authenticated
  using (bucket_id = 'execucoes' and (public.eh_o_aluno(((storage.foldername(name))[1])::uuid) or public.dono_do_aluno(((storage.foldername(name))[1])::uuid)));
drop policy if exists "apagar vídeo de execução" on storage.objects;
create policy "apagar vídeo de execução" on storage.objects
  for delete to authenticated
  using (bucket_id = 'execucoes' and (public.eh_o_aluno(((storage.foldername(name))[1])::uuid) or public.dono_do_aluno(((storage.foldername(name))[1])::uuid)));

-- ---------------------------------------------------------------------------
-- Mensagens particulares entre o aluno e o personal (cada aluno tem uma conversa).
-- ---------------------------------------------------------------------------

create table if not exists public.mensagens_privadas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade, -- a conversa
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  do_personal boolean not null default false, -- preenchido pelo banco
  texto text not null check (char_length(trim(texto)) between 1 and 1000),
  lida_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mensagens_privadas_idx on public.mensagens_privadas (aluno_id, created_at desc);

create or replace function public.preencher_mensagem_privada() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.do_personal := public.dono_do_aluno(new.aluno_id);
  new.texto := trim(new.texto);
  new.lida_em := null;
  return new;
end;
$$;
drop trigger if exists mensagem_privada_autor on public.mensagens_privadas;
create trigger mensagem_privada_autor before insert on public.mensagens_privadas
  for each row execute function public.preencher_mensagem_privada();

alter table public.mensagens_privadas enable row level security;
drop policy if exists "conversa do aluno com o personal" on public.mensagens_privadas;
create policy "conversa do aluno com o personal" on public.mensagens_privadas
  for select using (public.eh_o_aluno(aluno_id) or public.dono_do_aluno(aluno_id));
drop policy if exists "mandar mensagem particular" on public.mensagens_privadas;
create policy "mandar mensagem particular" on public.mensagens_privadas
  for insert with check (user_id = auth.uid() and (public.eh_o_aluno(aluno_id) or public.dono_do_aluno(aluno_id)));
drop policy if exists "apagar mensagem particular" on public.mensagens_privadas;
create policy "apagar mensagem particular" on public.mensagens_privadas
  for delete using (user_id = auth.uid());

-- Marca como lidas as mensagens que a outra pessoa mandou nesta conversa.
create or replace function public.marcar_lidas(p_aluno uuid) returns void
language sql security definer set search_path = public as $$
  update mensagens_privadas set lida_em = now()
  where aluno_id = p_aluno and lida_em is null and user_id <> auth.uid()
    and (public.eh_o_aluno(p_aluno) or public.dono_do_aluno(p_aluno))
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'mensagens_privadas') then
    alter publication supabase_realtime add table public.mensagens_privadas;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Diário da dieta: o aluno marca as refeições feitas (com foto do prato, se quiser) e o que comeu fora do plano.
-- ---------------------------------------------------------------------------

create table if not exists public.diario_dieta (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  data date not null default (now() at time zone 'America/Sao_Paulo')::date,
  refeicao int check (refeicao between 0 and 30),            -- posição da refeição no plano (quando é refeição do plano)
  alimento text check (char_length(alimento) between 1 and 80), -- ou um extra fora do plano
  gramas numeric(6, 1) check (gramas between 0 and 5000),
  macros jsonb check (macros is null or (jsonb_typeof(macros) = 'object' and pg_column_size(macros) < 400)),
  foto text check (foto ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'),
  created_at timestamptz not null default now(),
  check (refeicao is not null or alimento is not null)
);
create unique index if not exists diario_dieta_refeicao_idx on public.diario_dieta (aluno_id, data, refeicao) where refeicao is not null;
create index if not exists diario_dieta_aluno_idx on public.diario_dieta (aluno_id, data desc);

alter table public.diario_dieta enable row level security;
drop policy if exists "aluno cuida do seu diário" on public.diario_dieta;
create policy "aluno cuida do seu diário" on public.diario_dieta
  for all using (public.eh_o_aluno(aluno_id)) with check (public.eh_o_aluno(aluno_id));
drop policy if exists "personal vê o diário" on public.diario_dieta;
create policy "personal vê o diário" on public.diario_dieta
  for select using (public.dono_do_aluno(aluno_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pratos', 'pratos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "enviar foto do prato" on storage.objects;
create policy "enviar foto do prato" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pratos' and public.eh_o_aluno(((storage.foldername(name))[1])::uuid));
drop policy if exists "ver foto do prato" on storage.objects;
create policy "ver foto do prato" on storage.objects
  for select to authenticated
  using (bucket_id = 'pratos' and (
    public.eh_o_aluno(((storage.foldername(name))[1])::uuid) or public.dono_do_aluno(((storage.foldername(name))[1])::uuid)
  ));
drop policy if exists "apagar foto do prato" on storage.objects;
create policy "apagar foto do prato" on storage.objects
  for delete to authenticated
  using (bucket_id = 'pratos' and public.eh_o_aluno(((storage.foldername(name))[1])::uuid));
