-- Plataforma do Personal: tabelas, regras de acesso (RLS) e vínculo de login dos alunos.
-- Rode este arquivo inteiro uma vez em Supabase > SQL Editor.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

-- Quem está aqui é personal. A liberação é feita à mão (veja o README).
create table public.personais (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  created_at timestamptz not null default now()
);

create table public.alunos (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid() references public.personais (user_id) on delete cascade,
  -- Preenchido automaticamente quando existe uma conta com o mesmo e-mail.
  user_id uuid unique references auth.users (id) on delete set null,
  nome text not null,
  email text,
  telefone text,
  sexo text not null default 'F' check (sexo in ('F', 'M')),
  idade int check (idade between 5 and 110),
  objetivo text,
  plano text,
  inicio date default current_date,
  status text not null default 'ativo' check (status in ('ativo', 'pendente', 'pausado')),
  created_at timestamptz not null default now()
);
create unique index alunos_email_unico on public.alunos (lower(email)) where email is not null;
create index alunos_personal_idx on public.alunos (personal_id);

create table public.treinos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  nome text not null,
  foco text,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
create index treinos_aluno_idx on public.treinos (aluno_id);

create table public.exercicios (
  id uuid primary key default gen_random_uuid(),
  treino_id uuid not null references public.treinos (id) on delete cascade,
  nome text not null,
  series int,
  reps text,
  carga text,
  descanso text,
  obs text,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
create index exercicios_treino_idx on public.exercicios (treino_id);

create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  data date not null default current_date,
  peso numeric(5, 1),
  altura numeric(3, 2),
  protocolo text not null default 'manual' check (protocolo in ('p7', 'p3', 'manual')),
  dobras jsonb,          -- milímetros, ex.: {"peitoral": 10, "abdominal": 22, ...}
  gordura numeric(4, 1), -- % de gordura (Jackson & Pollock + Siri, ou informado)
  cintura numeric(5, 1),
  quadril numeric(5, 1),
  braco numeric(5, 1),
  coxa numeric(5, 1),
  created_at timestamptz not null default now()
);
create index avaliacoes_aluno_idx on public.avaliacoes (aluno_id, data);

-- Exercícios que o aluno marcou como feitos em cada dia.
create table public.registros (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  exercicio_id uuid not null references public.exercicios (id) on delete cascade,
  data date not null,
  created_at timestamptz not null default now(),
  unique (exercicio_id, data)
);
create index registros_aluno_idx on public.registros (aluno_id, data);

-- ---------------------------------------------------------------------------
-- Funções auxiliares das regras de acesso
-- (security definer evita recursão das políticas na tabela alunos)
-- ---------------------------------------------------------------------------

create function public.eh_personal() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from personais where user_id = auth.uid())
$$;

create function public.dono_do_aluno(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from alunos where id = a and personal_id = auth.uid())
$$;

create function public.eh_o_aluno(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from alunos where id = a and user_id = auth.uid() and status <> 'pausado')
$$;

create function public.aluno_do_treino(t uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select aluno_id from treinos where id = t
$$;

create function public.aluno_do_exercicio(e uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select t.aluno_id from exercicios x join treinos t on t.id = x.treino_id where x.id = e
$$;

-- ---------------------------------------------------------------------------
-- Vínculo entre conta de login e cadastro do aluno, pelo e-mail
-- ---------------------------------------------------------------------------

-- Quando o personal cadastra ou muda o e-mail do aluno.
create function public.vincular_aluno() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  new.email := nullif(lower(trim(new.email)), '');
  if new.email is null then
    new.user_id := null;
  else
    select id into new.user_id from auth.users where lower(email) = new.email limit 1;
  end if;
  return new;
end;
$$;

create trigger alunos_vincular
  before insert or update of email, user_id on public.alunos
  for each row execute function public.vincular_aluno();

-- Quando o aluno cria a conta depois de já estar cadastrado.
create function public.vincular_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update alunos set user_id = new.id
   where email = lower(new.email) and user_id is null;
  return new;
end;
$$;

create trigger auth_usuario_criado
  after insert on auth.users
  for each row execute function public.vincular_usuario();

-- ---------------------------------------------------------------------------
-- Regras de acesso (Row Level Security)
-- ---------------------------------------------------------------------------

alter table public.personais enable row level security;
alter table public.alunos enable row level security;
alter table public.treinos enable row level security;
alter table public.exercicios enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.registros enable row level security;

create policy "personal vê o próprio cadastro" on public.personais
  for select using (user_id = auth.uid());

-- Alunos: o personal gerencia os seus; o aluno só lê o próprio cadastro.
create policy "personal gerencia seus alunos" on public.alunos
  for all using (personal_id = auth.uid())
  with check (personal_id = auth.uid() and public.eh_personal());
create policy "aluno lê o próprio cadastro" on public.alunos
  for select using (user_id = auth.uid());

create policy "personal gerencia treinos" on public.treinos
  for all using (public.dono_do_aluno(aluno_id)) with check (public.dono_do_aluno(aluno_id));
create policy "aluno lê seus treinos" on public.treinos
  for select using (public.eh_o_aluno(aluno_id));

create policy "personal gerencia exercícios" on public.exercicios
  for all using (public.dono_do_aluno(public.aluno_do_treino(treino_id)))
  with check (public.dono_do_aluno(public.aluno_do_treino(treino_id)));
create policy "aluno lê seus exercícios" on public.exercicios
  for select using (public.eh_o_aluno(public.aluno_do_treino(treino_id)));

create policy "personal gerencia avaliações" on public.avaliacoes
  for all using (public.dono_do_aluno(aluno_id)) with check (public.dono_do_aluno(aluno_id));
create policy "aluno lê suas avaliações" on public.avaliacoes
  for select using (public.eh_o_aluno(aluno_id));

create policy "personal vê registros" on public.registros
  for select using (public.dono_do_aluno(aluno_id));
create policy "aluno lê seus registros" on public.registros
  for select using (public.eh_o_aluno(aluno_id));
create policy "aluno marca exercício feito" on public.registros
  for insert with check (
    public.eh_o_aluno(aluno_id) and public.aluno_do_exercicio(exercicio_id) = aluno_id
  );
create policy "aluno desmarca exercício" on public.registros
  for delete using (public.eh_o_aluno(aluno_id));
