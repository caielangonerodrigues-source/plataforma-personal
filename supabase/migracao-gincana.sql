-- Gincana: o personal (ou qualquer personal da equipe) cria uma gincana com prazo e provas que valem pontos
-- (ex.: "Trazer um amigo pra treinar" vale 50). Ele marca quem cumpriu cada prova: alunos ou equipes.
-- Cada dia de treino com check-in também pode valer pontos. O placar aparece na tela do Ranking.
-- Precisa de supabase/migracao-academia.sql (equipes) e migracao-equipe-localizacao.sql (dono_da_equipe).
-- Pode rodar mais de uma vez.

create table if not exists public.gincanas (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default public.dono_da_equipe() references public.personais (user_id) on delete cascade,
  titulo text not null check (char_length(trim(titulo)) between 1 and 80),
  descricao text check (char_length(descricao) <= 280),
  inicio date not null,
  fim date not null,
  por_equipe boolean not null default false, -- true: a pontuação é das equipes; false: de cada aluno
  pontos_por_treino int not null default 0 check (pontos_por_treino between 0 and 1000),
  created_at timestamptz not null default now(),
  check (fim >= inicio)
);
create index if not exists gincanas_personal_idx on public.gincanas (personal_id, fim);

create table if not exists public.gincana_provas (
  id uuid primary key default gen_random_uuid(),
  gincana_id uuid not null references public.gincanas (id) on delete cascade,
  titulo text not null check (char_length(trim(titulo)) between 1 and 80),
  descricao text check (char_length(descricao) <= 280),
  pontos int not null check (pontos between 1 and 10000),
  created_at timestamptz not null default now()
);
create index if not exists gincana_provas_idx on public.gincana_provas (gincana_id);

-- Quem cumpriu cada prova: um aluno ou uma equipe (conforme a gincana).
create table if not exists public.gincana_pontos (
  id uuid primary key default gen_random_uuid(),
  prova_id uuid not null references public.gincana_provas (id) on delete cascade,
  aluno_id uuid references public.alunos (id) on delete cascade,
  equipe_id uuid references public.equipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((aluno_id is null) <> (equipe_id is null))
);
create unique index if not exists gincana_pontos_aluno_uk on public.gincana_pontos (prova_id, aluno_id) where aluno_id is not null;
create unique index if not exists gincana_pontos_equipe_uk on public.gincana_pontos (prova_id, equipe_id) where equipe_id is not null;

alter table public.gincanas enable row level security;
alter table public.gincana_provas enable row level security;
alter table public.gincana_pontos enable row level security;

-- A equipe de personais gerencia; a turma (alunos da comunidade) só lê.
drop policy if exists "personal gerencia gincanas" on public.gincanas;
create policy "personal gerencia gincanas" on public.gincanas
  for all using (personal_id = public.dono_da_equipe()) with check (personal_id = public.dono_da_equipe());
drop policy if exists "turma vê gincanas" on public.gincanas;
create policy "turma vê gincanas" on public.gincanas
  for select using (personal_id = public.meu_grupo());

drop policy if exists "personal gerencia provas" on public.gincana_provas;
create policy "personal gerencia provas" on public.gincana_provas
  for all using (exists (select 1 from gincanas g where g.id = gincana_id and g.personal_id = public.dono_da_equipe()))
  with check (exists (select 1 from gincanas g where g.id = gincana_id and g.personal_id = public.dono_da_equipe()));
drop policy if exists "turma vê provas" on public.gincana_provas;
create policy "turma vê provas" on public.gincana_provas
  for select using (exists (select 1 from gincanas g where g.id = gincana_id and g.personal_id = public.meu_grupo()));

drop policy if exists "personal gerencia pontos" on public.gincana_pontos;
create policy "personal gerencia pontos" on public.gincana_pontos
  for all using (exists (select 1 from gincana_provas p join gincanas g on g.id = p.gincana_id where p.id = prova_id and g.personal_id = public.dono_da_equipe()))
  with check (exists (select 1 from gincana_provas p join gincanas g on g.id = p.gincana_id where p.id = prova_id and g.personal_id = public.dono_da_equipe()));
drop policy if exists "turma vê pontos" on public.gincana_pontos;
create policy "turma vê pontos" on public.gincana_pontos
  for select using (exists (select 1 from gincana_provas p join gincanas g on g.id = p.gincana_id where p.id = prova_id and g.personal_id = public.meu_grupo()));

-- ---------------------------------------------------------------------------
-- Desafio entre amigos (estilo GymRats): o aluno cria um desafio, manda o link de convite
-- e quem entra disputa um placar próprio de dias com check-in dentro do prazo.
-- ---------------------------------------------------------------------------

create table if not exists public.desafios_amigos (
  id uuid primary key default gen_random_uuid(),
  criador_id uuid not null references public.alunos (id) on delete cascade,
  titulo text not null check (char_length(trim(titulo)) between 1 and 60),
  descricao text check (char_length(descricao) <= 200),
  inicio date not null,
  fim date not null,
  meta_dias int check (meta_dias between 1 and 366),
  codigo text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  created_at timestamptz not null default now(),
  check (fim >= inicio and fim - inicio <= 366)
);

create table if not exists public.desafios_amigos_membros (
  desafio_id uuid not null references public.desafios_amigos (id) on delete cascade,
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (desafio_id, aluno_id)
);

-- Aluno logado (ativo).
create or replace function public.meu_aluno_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from alunos where user_id = auth.uid() and status <> 'pausado' limit 1
$$;

create or replace function public.participa_do_desafio(d uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from desafios_amigos_membros where desafio_id = d and aluno_id = public.meu_aluno_id())
$$;

alter table public.desafios_amigos enable row level security;
alter table public.desafios_amigos_membros enable row level security;

drop policy if exists "participante vê o desafio" on public.desafios_amigos;
create policy "participante vê o desafio" on public.desafios_amigos
  for select using (public.participa_do_desafio(id) or criador_id = public.meu_aluno_id());
drop policy if exists "aluno cria desafio" on public.desafios_amigos;
create policy "aluno cria desafio" on public.desafios_amigos
  for insert with check (criador_id = public.meu_aluno_id());
drop policy if exists "criador edita o desafio" on public.desafios_amigos;
create policy "criador edita o desafio" on public.desafios_amigos
  for update using (criador_id = public.meu_aluno_id()) with check (criador_id = public.meu_aluno_id());
drop policy if exists "criador apaga o desafio" on public.desafios_amigos;
create policy "criador apaga o desafio" on public.desafios_amigos
  for delete using (criador_id = public.meu_aluno_id());

drop policy if exists "participante vê os membros" on public.desafios_amigos_membros;
create policy "participante vê os membros" on public.desafios_amigos_membros
  for select using (public.participa_do_desafio(desafio_id));
drop policy if exists "aluno sai do desafio" on public.desafios_amigos_membros;
create policy "aluno sai do desafio" on public.desafios_amigos_membros
  for delete using (aluno_id = public.meu_aluno_id());

-- Quem cria já entra no desafio.
create or replace function public.criador_entra_no_desafio() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into desafios_amigos_membros (desafio_id, aluno_id) values (new.id, new.criador_id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists desafios_amigos_criador on public.desafios_amigos;
create trigger desafios_amigos_criador after insert on public.desafios_amigos
  for each row execute function public.criador_entra_no_desafio();

-- Entrar pelo link de convite (?desafio=CODIGO). Devolve o id do desafio.
create or replace function public.entrar_no_desafio(p_codigo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  eu uuid := public.meu_aluno_id();
  d uuid := (select id from desafios_amigos where codigo = lower(trim(p_codigo)));
begin
  if eu is null then raise exception 'Só alunos entram em desafios.'; end if;
  if d is null then raise exception 'Convite não encontrado. Confira o link.'; end if;
  if (select count(*) from desafios_amigos_membros where desafio_id = d) >= 50 then raise exception 'Esse desafio já tem 50 pessoas.'; end if;
  insert into desafios_amigos_membros (desafio_id, aluno_id) values (d, eu) on conflict do nothing;
  return d;
end $$;
revoke all on function public.entrar_no_desafio(text) from public;
grant execute on function public.entrar_no_desafio(text) to authenticated;

-- Nome do desafio no convite, antes de entrar.
create or replace function public.convite_do_desafio(p_codigo text) returns table (titulo text, criador text, inicio date, fim date, membros int)
language sql stable security definer set search_path = public as $$
  select d.titulo, a.nome, d.inicio, d.fim, (select count(*)::int from desafios_amigos_membros m where m.desafio_id = d.id)
    from desafios_amigos d join alunos a on a.id = d.criador_id
   where d.codigo = lower(trim(p_codigo)) and public.meu_aluno_id() is not null
$$;
revoke all on function public.convite_do_desafio(text) from public;
grant execute on function public.convite_do_desafio(text) to authenticated;

-- Placar do desafio: cada participante com os dias de check-in no prazo (só para quem participa).
create or replace function public.placar_desafio_amigos(p_desafio uuid) returns table (aluno_id uuid, nome text, avatar text, dias int)
language sql stable security definer set search_path = public as $$
  select a.id, a.nome, a.avatar,
         (select count(distinct c.data)::int from checkins c, desafios_amigos d
           where d.id = p_desafio and c.aluno_id = a.id and c.data between d.inicio and d.fim)
    from desafios_amigos_membros m join alunos a on a.id = m.aluno_id
   where m.desafio_id = p_desafio and public.participa_do_desafio(p_desafio)
$$;
revoke all on function public.placar_desafio_amigos(uuid) from public;
grant execute on function public.placar_desafio_amigos(uuid) to authenticated;
