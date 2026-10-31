-- "Monte sua dieta": o aluno anota o que comeu em cada refeição (café, almoço, lanches, jantar) e o exercício
-- do dia, como no MyFitnessPal. Fica separado do plano do personal; o personal só lê. Pode rodar mais de uma vez.

create table if not exists public.minha_dieta (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  data date not null default (now() at time zone 'America/Sao_Paulo')::date,
  refeicao text not null check (refeicao in ('cafe', 'almoco', 'lanches', 'jantar', 'exercicio')),
  alimento text not null check (char_length(alimento) between 1 and 80),
  gramas numeric(6, 1) check (gramas between 0 and 5000),
  macros jsonb not null check (jsonb_typeof(macros) = 'object' and pg_column_size(macros) < 400),
  created_at timestamptz not null default now()
);
create index if not exists minha_dieta_aluno_idx on public.minha_dieta (aluno_id, data desc);

alter table public.minha_dieta enable row level security;
drop policy if exists "aluno monta sua dieta" on public.minha_dieta;
create policy "aluno monta sua dieta" on public.minha_dieta
  for all using (public.eh_o_aluno(aluno_id)) with check (public.eh_o_aluno(aluno_id));
drop policy if exists "personal vê a dieta montada" on public.minha_dieta;
create policy "personal vê a dieta montada" on public.minha_dieta
  for select using (public.dono_do_aluno(aluno_id));
grant select, insert, update, delete on public.minha_dieta to authenticated;
