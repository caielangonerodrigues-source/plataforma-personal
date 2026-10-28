-- Plataforma do Personal: tabelas, regras de acesso (RLS) e vínculo de login dos alunos.
-- Rode este arquivo inteiro uma vez em Supabase > SQL Editor.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

-- Quem está aqui é personal. A liberação é feita à mão (veja o README).
create table public.personais (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  telefone text,
  -- Recebimento das mensalidades por Pix (QR Code estático gerado no site)
  pix_chave text,
  pix_nome text,   -- nome do recebedor, como aparece no banco
  pix_cidade text,
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
  comunidade boolean not null default true, -- aparece no feed e no ranking dos colegas
  valor_mensal numeric(8, 2),               -- mensalidade; vazio = não cobra pela plataforma
  dia_vencimento int check (dia_vencimento between 1 and 28),
  modalidade text not null default 'presencial' check (modalidade in ('presencial', 'online')), -- online = consultoria
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
  video_url text check (video_url ~ '^https://'), -- vídeo de execução (YouTube, Instagram...)
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
  series jsonb, -- carga e repetições feitas: [{"carga": 30, "reps": 12}, ...]
  created_at timestamptz not null default now(),
  unique (exercicio_id, data)
);
create index registros_aluno_idx on public.registros (aluno_id, data);

-- Check-ins da comunidade (estilo GymRats): um por treino, com foto e comentário opcionais.
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  data date not null,
  treino_id uuid references public.treinos (id) on delete set null,
  titulo text check (char_length(titulo) <= 80), -- ex.: "Treino A · Membros inferiores" ou "Corrida"
  comentario text check (char_length(comentario) <= 280),
  foto text, -- caminho no Storage, bucket "checkins": <aluno_id>/<arquivo>.jpg
  created_at timestamptz not null default now()
);
create index checkins_aluno_idx on public.checkins (aluno_id, data);
create index checkins_recentes_idx on public.checkins (created_at desc);

create table public.curtidas (
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (checkin_id, user_id)
);

-- Desafios com prazo criados pelo personal (ex.: "20 treinos em novembro").
create table public.desafios (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid() references public.personais (user_id) on delete cascade,
  titulo text not null check (char_length(titulo) <= 80),
  descricao text check (char_length(descricao) <= 280),
  inicio date not null,
  fim date not null,
  meta_dias int not null check (meta_dias between 1 and 366),
  created_at timestamptz not null default now(),
  check (fim >= inicio)
);
create index desafios_personal_idx on public.desafios (personal_id, fim);

-- Anamnese e PAR-Q (um registro por aluno; aluno e personal podem preencher).
create table public.anamneses (
  aluno_id uuid primary key references public.alunos (id) on delete cascade,
  parq jsonb not null default '{}',  -- {"p1": false, ..., "p7": true}
  lesoes text,
  doencas text,
  medicamentos text,
  cirurgias text,
  atividade_atual text,
  observacoes text,
  updated_at timestamptz not null default now()
);

-- Fotos de evolução (privadas: só o aluno e o personal veem).
create table public.fotos_evolucao (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  data date not null,
  angulo text not null check (angulo in ('frente', 'lado', 'costas')),
  caminho text not null, -- Storage, bucket "evolucao": <aluno_id>/<arquivo>.jpg
  created_at timestamptz not null default now()
);
create index fotos_evolucao_aluno_idx on public.fotos_evolucao (aluno_id, data);

-- Mensalidades pagas (uma linha por mês pago; o personal marca).
create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  competencia text not null check (competencia ~ '^[0-9]{4}-[0-9]{2}$'), -- "2026-11"
  valor numeric(8, 2),
  pago_em date not null default current_date,
  created_at timestamptz not null default now(),
  unique (aluno_id, competencia)
);

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

-- Turma de quem está logado: o próprio id se for personal, ou o personal do aluno
-- (só se o aluno estiver ativo e participando da comunidade).
create function public.meu_grupo() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select user_id from personais where user_id = auth.uid()),
    (select personal_id from alunos where user_id = auth.uid() and status <> 'pausado' and comunidade)
  )
$$;

-- Pode ver os check-ins deste aluno: o personal dele, o próprio aluno,
-- ou um colega da mesma turma (os dois participando da comunidade).
create function public.pode_ver_checkin(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.dono_do_aluno(a) or public.eh_o_aluno(a) or exists (
    select 1 from alunos x where x.id = a and x.comunidade and x.status <> 'pausado' and x.personal_id = public.meu_grupo()
  )
$$;

-- Personal do aluno logado (mesmo fora da comunidade), para desafios e Pix.
create function public.meu_personal() returns uuid
language sql stable security definer set search_path = public as $$
  select personal_id from alunos where user_id = auth.uid() and status <> 'pausado'
$$;

-- Dados de Pix do personal, para o aluno pagar a mensalidade.
create function public.pix_do_personal()
returns table (pix_chave text, pix_nome text, pix_cidade text, nome text, telefone text)
language sql stable security definer set search_path = public as $$
  select pix_chave, pix_nome, pix_cidade, nome, telefone from personais where user_id = public.meu_personal()
$$;

create function public.aluno_do_checkin(c uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select aluno_id from checkins where id = c
$$;

-- Nomes da turma para o feed e o ranking, sem expor e-mail ou telefone.
create function public.comunidade_membros() returns table (id uuid, nome text)
language sql stable security definer set search_path = public as $$
  select a.id, a.nome from alunos a
   where a.personal_id = auth.uid()
      or (a.comunidade and a.status <> 'pausado' and a.personal_id = public.meu_grupo())
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
alter table public.checkins enable row level security;
alter table public.curtidas enable row level security;
alter table public.desafios enable row level security;
alter table public.anamneses enable row level security;
alter table public.fotos_evolucao enable row level security;
alter table public.pagamentos enable row level security;

create policy "personal vê o próprio cadastro" on public.personais
  for select using (user_id = auth.uid());
create policy "personal edita o próprio cadastro" on public.personais
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

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
create policy "aluno anota cargas" on public.registros
  for update using (public.eh_o_aluno(aluno_id))
  with check (public.eh_o_aluno(aluno_id) and public.aluno_do_exercicio(exercicio_id) = aluno_id);

-- Check-ins: a turma vê; o aluno publica os seus; o personal pode apagar qualquer um dos seus alunos.
create policy "turma vê check-ins" on public.checkins
  for select using (public.pode_ver_checkin(aluno_id));
create policy "aluno faz check-in" on public.checkins
  for insert with check (
    public.eh_o_aluno(aluno_id) and (treino_id is null or public.aluno_do_treino(treino_id) = aluno_id)
  );
create policy "apagar check-in" on public.checkins
  for delete using (public.eh_o_aluno(aluno_id) or public.dono_do_aluno(aluno_id));

create policy "turma vê curtidas" on public.curtidas
  for select using (public.pode_ver_checkin(public.aluno_do_checkin(checkin_id)));
create policy "curtir" on public.curtidas
  for insert with check (user_id = auth.uid() and public.pode_ver_checkin(public.aluno_do_checkin(checkin_id)));
create policy "descurtir" on public.curtidas
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Fotos dos check-ins (Supabase Storage, bucket privado)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public) values ('checkins', 'checkins', false)
on conflict (id) do nothing;

create policy "aluno envia foto do check-in" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'checkins' and public.eh_o_aluno(((storage.foldername(name))[1])::uuid));
create policy "turma vê fotos dos check-ins" on storage.objects
  for select to authenticated
  using (bucket_id = 'checkins' and public.pode_ver_checkin(((storage.foldername(name))[1])::uuid));
create policy "apagar foto do check-in" on storage.objects
  for delete to authenticated
  using (bucket_id = 'checkins' and (
    public.eh_o_aluno(((storage.foldername(name))[1])::uuid) or public.dono_do_aluno(((storage.foldername(name))[1])::uuid)
  ));

-- Desafios: o personal gerencia; seus alunos ativos leem.
create policy "personal gerencia desafios" on public.desafios
  for all using (personal_id = auth.uid()) with check (personal_id = auth.uid() and public.eh_personal());
create policy "aluno vê desafios do seu personal" on public.desafios
  for select using (personal_id = public.meu_personal());

-- Anamnese: o aluno e o personal leem e preenchem.
create policy "personal gerencia anamnese" on public.anamneses
  for all using (public.dono_do_aluno(aluno_id)) with check (public.dono_do_aluno(aluno_id));
create policy "aluno lê a própria anamnese" on public.anamneses
  for select using (public.eh_o_aluno(aluno_id));
create policy "aluno preenche a própria anamnese" on public.anamneses
  for insert with check (public.eh_o_aluno(aluno_id));
create policy "aluno atualiza a própria anamnese" on public.anamneses
  for update using (public.eh_o_aluno(aluno_id)) with check (public.eh_o_aluno(aluno_id));

-- Fotos de evolução: o personal gerencia; o aluno vê e envia as suas.
create policy "personal gerencia fotos de evolução" on public.fotos_evolucao
  for all using (public.dono_do_aluno(aluno_id)) with check (public.dono_do_aluno(aluno_id));
create policy "aluno vê suas fotos de evolução" on public.fotos_evolucao
  for select using (public.eh_o_aluno(aluno_id));
create policy "aluno envia foto de evolução" on public.fotos_evolucao
  for insert with check (public.eh_o_aluno(aluno_id));

-- Pagamentos: o personal marca; o aluno só vê os seus.
create policy "personal gerencia pagamentos" on public.pagamentos
  for all using (public.dono_do_aluno(aluno_id)) with check (public.dono_do_aluno(aluno_id));
create policy "aluno vê seus pagamentos" on public.pagamentos
  for select using (public.eh_o_aluno(aluno_id));

insert into storage.buckets (id, name, public) values ('evolucao', 'evolucao', false)
on conflict (id) do nothing;

create policy "enviar foto de evolução" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evolucao' and (
    public.eh_o_aluno(((storage.foldername(name))[1])::uuid) or public.dono_do_aluno(((storage.foldername(name))[1])::uuid)
  ));
create policy "ver foto de evolução" on storage.objects
  for select to authenticated
  using (bucket_id = 'evolucao' and (
    public.eh_o_aluno(((storage.foldername(name))[1])::uuid) or public.dono_do_aluno(((storage.foldername(name))[1])::uuid)
  ));
create policy "apagar foto de evolução" on storage.objects
  for delete to authenticated
  using (bucket_id = 'evolucao' and public.dono_do_aluno(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------------------
-- Spinning: aulas com 14 bikes e reservas (alunos e visitantes, sem login)
-- ---------------------------------------------------------------------------

create table public.aulas_spinning (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid() references public.personais (user_id) on delete cascade,
  titulo text not null default 'Spinning' check (char_length(titulo) <= 60),
  instrutor text check (char_length(instrutor) <= 60),
  inicio timestamptz not null,
  duracao_min int not null default 45 check (duracao_min between 10 and 240),
  valor numeric(8, 2) not null default 0 check (valor >= 0),
  vagas int not null default 14 check (vagas between 1 and 40),
  bloqueadas int[] not null default '{}', -- bikes em manutenção
  cancelada boolean not null default false,
  created_at timestamptz not null default now()
);
create index aulas_spinning_inicio_idx on public.aulas_spinning (inicio);

create table public.reservas_spinning (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas_spinning (id) on delete cascade,
  bike int not null,
  nome text not null check (char_length(nome) between 2 and 80),
  telefone text not null check (char_length(telefone) between 8 and 20),
  aluno_id uuid references public.alunos (id) on delete set null,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelada')),
  codigo text not null default upper(substr(md5(gen_random_uuid()::text), 1, 8)), -- referência do Pix
  created_at timestamptz not null default now()
);
-- Uma bike só pode ter uma reserva ativa por aula.
create unique index reservas_bike_unica on public.reservas_spinning (aula_id, bike) where status <> 'cancelada';
create index reservas_aula_idx on public.reservas_spinning (aula_id);

alter table public.aulas_spinning enable row level security;
alter table public.reservas_spinning enable row level security;

-- Qualquer pessoa (mesmo sem login) vê as aulas; só o personal cria e altera as suas.
create policy "todos veem aulas" on public.aulas_spinning
  for select to anon, authenticated using (true);
create policy "personal gerencia aulas" on public.aulas_spinning
  for all to authenticated using (personal_id = auth.uid())
  with check (personal_id = auth.uid() and public.eh_personal());

-- Reservas: só o personal da aula lê e altera direto. Visitantes usam as funções abaixo.
create policy "personal gerencia reservas" on public.reservas_spinning
  for all to authenticated
  using (exists (select 1 from aulas_spinning a where a.id = aula_id and a.personal_id = auth.uid()))
  with check (exists (select 1 from aulas_spinning a where a.id = aula_id and a.personal_id = auth.uid()));

-- Reserva pendente há mais de 30 minutos libera a bike.
create function public.liberar_reservas_vencidas(a uuid) returns void
language sql security definer set search_path = public as $$
  update reservas_spinning set status = 'cancelada'
   where aula_id = a and status = 'pendente' and created_at < now() - interval '30 minutes'
$$;

-- Bikes ocupadas (sem nomes) para o mapa.
create function public.bikes_ocupadas(a uuid) returns int[]
language plpgsql security definer set search_path = public as $$
begin
  perform liberar_reservas_vencidas(a);
  return coalesce((select array_agg(bike order by bike) from reservas_spinning where aula_id = a and status <> 'cancelada'), '{}');
end;
$$;

create function public.reservar_bike(p_aula uuid, p_bike int, p_nome text, p_telefone text)
returns table (id uuid, codigo text)
language plpgsql security definer set search_path = public as $$
declare
  aula aulas_spinning;
  tel text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
begin
  select * into aula from aulas_spinning where aulas_spinning.id = p_aula;
  if aula.id is null or aula.cancelada then raise exception 'Aula não encontrada ou cancelada.'; end if;
  if aula.inicio < now() then raise exception 'Esta aula já começou.'; end if;
  if p_bike < 1 or p_bike > aula.vagas or p_bike = any (aula.bloqueadas) then raise exception 'Bike indisponível.'; end if;
  if char_length(trim(coalesce(p_nome, ''))) < 2 then raise exception 'Informe seu nome.'; end if;
  if char_length(tel) < 10 then raise exception 'Informe um WhatsApp com DDD.'; end if;
  perform liberar_reservas_vencidas(p_aula);
  if (select count(*) from reservas_spinning r
       where r.aula_id = p_aula and r.status <> 'cancelada' and regexp_replace(r.telefone, '\D', '', 'g') = tel) >= 2 then
    raise exception 'Este WhatsApp já tem 2 bikes reservadas nesta aula.';
  end if;
  begin
    return query
      insert into reservas_spinning as r (aula_id, bike, nome, telefone, aluno_id, status)
      values (p_aula, p_bike, trim(p_nome), trim(p_telefone),
              (select x.id from alunos x where x.user_id = auth.uid() and x.personal_id = aula.personal_id),
              case when aula.valor = 0 then 'pago' else 'pendente' end) -- aula gratuita já fica confirmada
      returning r.id, r.codigo;
  exception when unique_violation then
    raise exception 'Essa bike acabou de ser reservada. Escolha outra.';
  end;
end;
$$;

-- Dados da reserva para quem tem o link (id + código): situação, aula e Pix do personal.
create function public.minha_reserva(p_id uuid, p_codigo text)
returns table (id uuid, codigo text, bike int, nome text, status text, criada timestamptz, aula_id uuid,
               aula_titulo text, aula_inicio timestamptz, aula_duracao int, instrutor text, valor numeric,
               pix_chave text, pix_nome text, pix_cidade text, personal_nome text, personal_telefone text)
language plpgsql security definer set search_path = public as $$
begin
  perform liberar_reservas_vencidas((select r.aula_id from reservas_spinning r where r.id = p_id));
  return query
    select r.id, r.codigo, r.bike, r.nome, r.status, r.created_at, a.id,
           a.titulo, a.inicio, a.duracao_min, a.instrutor, a.valor,
           p.pix_chave, p.pix_nome, p.pix_cidade, p.nome, p.telefone
      from reservas_spinning r
      join aulas_spinning a on a.id = r.aula_id
      join personais p on p.user_id = a.personal_id
     where r.id = p_id and r.codigo = upper(p_codigo);
end;
$$;

create function public.cancelar_minha_reserva(p_id uuid, p_codigo text) returns void
language sql security definer set search_path = public as $$
  update reservas_spinning set status = 'cancelada'
   where id = p_id and codigo = upper(p_codigo) and status = 'pendente'
$$;

grant execute on function public.bikes_ocupadas(uuid), public.reservar_bike(uuid, int, text, text),
  public.minha_reserva(uuid, text), public.cancelar_minha_reserva(uuid, text) to anon, authenticated;
revoke execute on function public.liberar_reservas_vencidas(uuid) from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- Consultoria online: o aluno envia peso, medidas, fotos e como foi a semana;
-- o personal responde e, se quiser, registra como avaliação.
-- ---------------------------------------------------------------------------

create table public.envios_consultoria (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  data date not null default current_date,
  peso numeric(5, 1),
  gordura numeric(4, 1),       -- % de gordura da balança de bioimpedância, se o aluno tiver
  medidas jsonb not null default '{}', -- centímetros, ex.: {"cintura": 82, "braco_d": 33}
  sono smallint check (sono between 1 and 5),
  energia smallint check (energia between 1 and 5),
  dieta smallint check (dieta between 1 and 5),
  treinos_semana smallint check (treinos_semana between 0 and 14),
  comentario text check (char_length(comentario) <= 2000),
  resposta text check (char_length(resposta) <= 4000),
  respondido_em timestamptz,
  avaliacao_id uuid references public.avaliacoes (id) on delete set null,
  created_at timestamptz not null default now()
);
create index envios_consultoria_aluno_idx on public.envios_consultoria (aluno_id, data);

alter table public.envios_consultoria enable row level security;

create policy "personal gerencia envios" on public.envios_consultoria
  for all using (public.dono_do_aluno(aluno_id)) with check (public.dono_do_aluno(aluno_id));
create policy "aluno vê seus envios" on public.envios_consultoria
  for select using (public.eh_o_aluno(aluno_id));
create policy "aluno envia" on public.envios_consultoria
  for insert with check (public.eh_o_aluno(aluno_id) and resposta is null and respondido_em is null and avaliacao_id is null);
create policy "aluno apaga envio sem resposta" on public.envios_consultoria
  for delete using (public.eh_o_aluno(aluno_id) and resposta is null);
