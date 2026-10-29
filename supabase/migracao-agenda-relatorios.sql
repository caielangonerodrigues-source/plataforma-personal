-- Agenda dos atendimentos, troca de exercício pelo aluno e relatório mensal.
-- Rode depois do schema.sql (Supabase > SQL Editor > New query > cole tudo > Run). Pode rodar mais de uma vez.

-- Troca de exercício: nome do exercício que o aluno fez no lugar, naquele dia (aparelho ocupado).
alter table public.registros add column if not exists troca text check (char_length(troca) <= 80);

-- Horários fixos de cada aluno na semana (0 = domingo, 1 = segunda ... 6 = sábado).
create table if not exists public.horarios (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid() references public.personais (user_id) on delete cascade,
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6),
  hora time not null,
  duracao int not null default 60 check (duracao between 10 and 300), -- minutos
  local text check (char_length(local) <= 80),
  created_at timestamptz not null default now()
);
create index if not exists horarios_personal_idx on public.horarios (personal_id);
create index if not exists horarios_aluno_idx on public.horarios (aluno_id);

-- Mudança de um dia só: remarcado para nova_data/nova_hora, ou desmarcado (nova_data vazia).
create table if not exists public.remarcacoes (
  id uuid primary key default gen_random_uuid(),
  horario_id uuid not null references public.horarios (id) on delete cascade,
  data date not null,         -- dia original do atendimento
  nova_data date,
  nova_hora time,
  motivo text check (char_length(motivo) <= 200),
  created_at timestamptz not null default now(),
  unique (horario_id, data)
);

create or replace function public.aluno_do_horario(h uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select aluno_id from horarios where id = h
$$;

alter table public.horarios enable row level security;
alter table public.remarcacoes enable row level security;
drop policy if exists "personal gerencia horários" on public.horarios;
create policy "personal gerencia horários" on public.horarios
  for all using (public.dono_do_aluno(aluno_id)) with check (public.dono_do_aluno(aluno_id) and personal_id = auth.uid());
drop policy if exists "aluno vê seus horários" on public.horarios;
create policy "aluno vê seus horários" on public.horarios
  for select using (public.eh_o_aluno(aluno_id));
drop policy if exists "personal gerencia remarcações" on public.remarcacoes;
create policy "personal gerencia remarcações" on public.remarcacoes
  for all using (public.dono_do_aluno(public.aluno_do_horario(horario_id)))
  with check (public.dono_do_aluno(public.aluno_do_horario(horario_id)));
drop policy if exists "aluno vê suas remarcações" on public.remarcacoes;
create policy "aluno vê suas remarcações" on public.remarcacoes
  for select using (public.eh_o_aluno(public.aluno_do_horario(horario_id)));

-- Relatório mensal de evolução (montado com a IA e revisado pelo personal). Um por aluno e mês.
-- conteudo = {"titulo", "resumo", "destaques": [], "atencao": [], "proximo_mes", "mensagem"}
create table if not exists public.relatorios (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  mes text not null check (mes ~ '^\d{4}-\d{2}$'), -- AAAA-MM
  conteudo jsonb not null check (jsonb_typeof(conteudo) = 'object'),
  publicado boolean not null default false,        -- aparece na área do aluno
  updated_at timestamptz not null default now(),
  unique (aluno_id, mes)
);
alter table public.relatorios enable row level security;
drop policy if exists "personal gerencia relatórios" on public.relatorios;
create policy "personal gerencia relatórios" on public.relatorios
  for all using (public.dono_do_aluno(aluno_id)) with check (public.dono_do_aluno(aluno_id));
drop policy if exists "aluno vê relatórios publicados" on public.relatorios;
create policy "aluno vê relatórios publicados" on public.relatorios
  for select using (publicado and public.eh_o_aluno(aluno_id));
