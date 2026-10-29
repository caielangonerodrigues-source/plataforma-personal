-- Biblioteca de exercícios do personal e dieta (nutrição) do aluno.
-- Rode depois do schema.sql (Supabase > SQL Editor > New query > cole tudo > Run). Pode rodar mais de uma vez.

-- Exercícios que o personal cadastra para aparecer na biblioteca junto com os prontos.
create table if not exists public.exercicios_biblioteca (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid() references public.personais (user_id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  grupo text not null check (char_length(grupo) between 1 and 40),
  equipamento text check (char_length(equipamento) <= 40),
  video_url text check (video_url ~ '^https://'),
  created_at timestamptz not null default now()
);
create index if not exists exercicios_biblioteca_personal_idx on public.exercicios_biblioteca (personal_id);
alter table public.exercicios_biblioteca enable row level security;
drop policy if exists "personal gerencia sua biblioteca" on public.exercicios_biblioteca;
create policy "personal gerencia sua biblioteca" on public.exercicios_biblioteca
  for all using (personal_id = auth.uid()) with check (personal_id = auth.uid() and public.eh_personal());

-- Dieta do aluno: uma por aluno, montada pelo personal (à mão ou com a IA).
-- refeicoes = [{"nome": "Almoço", "horario": "12:30", "itens": [{"alimento", "quantidade", "gramas", "kcal", "proteina", "carboidrato", "gordura"}]}]
create table if not exists public.dietas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null unique references public.alunos (id) on delete cascade,
  calorias int check (calorias between 0 and 10000),
  proteina int check (proteina between 0 and 1000),
  carboidrato int check (carboidrato between 0 and 2000),
  gordura int check (gordura between 0 and 1000),
  agua numeric(3, 1) check (agua between 0 and 15),
  refeicoes jsonb not null default '[]' check (jsonb_typeof(refeicoes) = 'array'),
  orientacoes text check (char_length(orientacoes) <= 4000),
  updated_at timestamptz not null default now()
);
alter table public.dietas enable row level security;
drop policy if exists "personal gerencia dietas" on public.dietas;
create policy "personal gerencia dietas" on public.dietas
  for all using (public.dono_do_aluno(aluno_id)) with check (public.dono_do_aluno(aluno_id));
drop policy if exists "aluno lê sua dieta" on public.dietas;
create policy "aluno lê sua dieta" on public.dietas
  for select using (public.eh_o_aluno(aluno_id));
