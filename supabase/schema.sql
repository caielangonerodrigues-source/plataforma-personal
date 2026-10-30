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
  -- Página de vendas da consultoria online (/consultoria)
  venda_ativa boolean not null default false,
  venda_titulo text check (char_length(venda_titulo) <= 80),
  venda_texto text check (char_length(venda_texto) <= 3000),
  instagram text check (char_length(instagram) <= 40),
  cref text check (char_length(cref) <= 30),
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
  metodo text check (metodo ~ '^[a-z0-9_]{1,30}$'), -- método de treino (drop set, bi-set...), ids em src/lib/metodos.js
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
               pix_chave text, pix_nome text, pix_cidade text, personal_nome text, personal_telefone text,
               com_pacote boolean) -- paga com pacote: dá para cancelar até 2 horas antes e a aula volta ao saldo
language plpgsql security definer set search_path = public as $$
begin
  perform liberar_reservas_vencidas((select r.aula_id from reservas_spinning r where r.id = p_id));
  return query
    select r.id, r.codigo, r.bike, r.nome, r.status, r.created_at, a.id,
           a.titulo, a.inicio, a.duracao_min, a.instrutor, a.valor,
           p.pix_chave, p.pix_nome, p.pix_cidade, p.nome, p.telefone, r.credito_id is not null
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

-- ---------------------------------------------------------------------------
-- Treinos modelo: fichas prontas para aplicar em qualquer aluno.
-- fichas = [{"nome": "A", "foco": "...", "exercicios": [{"nome", "series", "reps", "carga", "descanso", "obs", "video_url"}]}]
-- ---------------------------------------------------------------------------

create table public.modelos_treino (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid() references public.personais (user_id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  descricao text check (char_length(descricao) <= 300),
  fichas jsonb not null default '[]' check (jsonb_typeof(fichas) = 'array'),
  created_at timestamptz not null default now()
);
alter table public.modelos_treino enable row level security;
create policy "personal gerencia seus modelos" on public.modelos_treino
  for all using (personal_id = auth.uid()) with check (personal_id = auth.uid() and public.eh_personal());

-- ---------------------------------------------------------------------------
-- Spinning: lista de espera e pacotes de aulas
-- ---------------------------------------------------------------------------

create table public.espera_spinning (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas_spinning (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 80),
  telefone text not null check (char_length(telefone) between 8 and 20),
  avisado_em timestamptz,
  created_at timestamptz not null default now()
);
create unique index espera_unica on public.espera_spinning (aula_id, (regexp_replace(telefone, '\D', '', 'g')));
alter table public.espera_spinning enable row level security;
create policy "personal gerencia lista de espera" on public.espera_spinning
  for all to authenticated
  using (exists (select 1 from aulas_spinning a where a.id = aula_id and a.personal_id = auth.uid()))
  with check (exists (select 1 from aulas_spinning a where a.id = aula_id and a.personal_id = auth.uid()));

-- Entra na fila de uma aula lotada. Devolve a posição.
create function public.entrar_na_espera(p_aula uuid, p_nome text, p_telefone text) returns int
language plpgsql security definer set search_path = public as $$
declare
  aula aulas_spinning;
  tel text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
begin
  select * into aula from aulas_spinning where id = p_aula;
  if aula.id is null or aula.cancelada then raise exception 'Aula não encontrada ou cancelada.'; end if;
  if aula.inicio < now() then raise exception 'Esta aula já começou.'; end if;
  if char_length(trim(coalesce(p_nome, ''))) < 2 then raise exception 'Informe seu nome.'; end if;
  if char_length(tel) < 10 then raise exception 'Informe um WhatsApp com DDD.'; end if;
  insert into espera_spinning (aula_id, nome, telefone) values (p_aula, trim(p_nome), trim(p_telefone))
    on conflict do nothing;
  return (select count(*) from espera_spinning e where e.aula_id = p_aula
           and e.created_at <= (select created_at from espera_spinning x where x.aula_id = p_aula and regexp_replace(x.telefone, '\D', '', 'g') = tel));
end;
$$;

create function public.tamanho_espera(a uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from espera_spinning where aula_id = a and avisado_em is null
$$;

-- Pacotes que o personal vende (ex.: 10 aulas por R$ 250, válido por 90 dias).
create table public.pacotes_spinning (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid() references public.personais (user_id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 60),
  aulas int not null check (aulas between 1 and 100),
  valor numeric(8, 2) not null check (valor > 0),
  validade_dias int not null default 90 check (validade_dias between 1 and 730),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.pacotes_spinning enable row level security;
create policy "todos veem pacotes" on public.pacotes_spinning for select to anon, authenticated using (true);
create policy "personal gerencia pacotes" on public.pacotes_spinning
  for all to authenticated using (personal_id = auth.uid()) with check (personal_id = auth.uid() and public.eh_personal());

-- Cada compra de pacote. O código (vai no Pix) é o que a pessoa usa para reservar com o saldo.
create table public.creditos_spinning (
  id uuid primary key default gen_random_uuid(),
  pacote_id uuid references public.pacotes_spinning (id) on delete set null,
  personal_id uuid not null references public.personais (user_id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 80),
  telefone text not null check (char_length(telefone) between 8 and 20),
  aulas int not null check (aulas between 1 and 100),
  valor numeric(8, 2) not null,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelada')),
  validade date,
  codigo text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  mp_pagamento text, -- id do pagamento no Mercado Pago, quando o Pix automático está ligado
  created_at timestamptz not null default now()
);
alter table public.creditos_spinning enable row level security;
create policy "personal gerencia créditos" on public.creditos_spinning
  for all to authenticated using (personal_id = auth.uid()) with check (personal_id = auth.uid() and public.eh_personal());

alter table public.reservas_spinning add column credito_id uuid references public.creditos_spinning (id) on delete set null;
alter table public.reservas_spinning add column mp_pagamento text;

-- A validade conta a partir da confirmação do pagamento.
create function public.validade_do_credito() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'pago' and (tg_op = 'INSERT' or old.status <> 'pago') and new.validade is null then
    new.validade := current_date + coalesce((select validade_dias from pacotes_spinning where id = new.pacote_id), 90);
  end if;
  return new;
end;
$$;
create trigger credito_validade before insert or update on public.creditos_spinning
  for each row execute function public.validade_do_credito();

create function public.comprar_pacote(p_pacote uuid, p_nome text, p_telefone text)
returns table (id uuid, codigo text)
language plpgsql security definer set search_path = public as $$
declare
  pac pacotes_spinning;
  tel text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
begin
  select * into pac from pacotes_spinning where pacotes_spinning.id = p_pacote and ativo;
  if pac.id is null then raise exception 'Pacote não encontrado.'; end if;
  if char_length(trim(coalesce(p_nome, ''))) < 2 then raise exception 'Informe seu nome.'; end if;
  if char_length(tel) < 10 then raise exception 'Informe um WhatsApp com DDD.'; end if;
  if (select count(*) from creditos_spinning c where regexp_replace(c.telefone, '\D', '', 'g') = tel
        and c.status = 'pendente' and c.created_at > now() - interval '1 day') >= 3 then
    raise exception 'Você já tem compras aguardando Pix. Pague ou fale com o personal.';
  end if;
  return query insert into creditos_spinning as c (pacote_id, personal_id, nome, telefone, aulas, valor)
    values (pac.id, pac.personal_id, trim(p_nome), trim(p_telefone), pac.aulas, pac.valor)
    returning c.id, c.codigo;
end;
$$;

-- Aulas que ainda restam num crédito pago e dentro da validade.
create function public.saldo_do_credito(c creditos_spinning) returns int
language sql stable security definer set search_path = public as $$
  select case when c.status = 'pago' and (c.validade is null or c.validade >= current_date)
    then c.aulas - (select count(*)::int from reservas_spinning r where r.credito_id = c.id and r.status <> 'cancelada')
    else 0 end
$$;

create function public.meu_pacote(p_codigo text)
returns table (id uuid, codigo text, nome text, status text, aulas int, saldo int, validade date, valor numeric, criada timestamptz,
               pacote_nome text, pix_chave text, pix_nome text, pix_cidade text, personal_nome text, personal_telefone text)
language sql stable security definer set search_path = public as $$
  select c.id, c.codigo, c.nome, c.status, c.aulas, public.saldo_do_credito(c), c.validade, c.valor, c.created_at,
         p.nome, pe.pix_chave, pe.pix_nome, pe.pix_cidade, pe.nome, pe.telefone
    from creditos_spinning c
    left join pacotes_spinning p on p.id = c.pacote_id
    join personais pe on pe.user_id = c.personal_id
   where c.codigo = upper(trim(p_codigo))
$$;

-- Reserva usando uma aula do pacote: já entra como paga.
create function public.reservar_com_pacote(p_aula uuid, p_bike int, p_codigo text)
returns table (id uuid, codigo text)
language plpgsql security definer set search_path = public as $$
declare
  cred creditos_spinning;
  aula aulas_spinning;
  nova record;
begin
  select * into cred from creditos_spinning where creditos_spinning.codigo = upper(trim(coalesce(p_codigo, ''))) for update;
  if cred.id is null then raise exception 'Código do pacote não encontrado.'; end if;
  select * into aula from aulas_spinning where aulas_spinning.id = p_aula;
  if aula.personal_id is distinct from cred.personal_id then raise exception 'Este pacote não vale para esta aula.'; end if;
  if aula.valor = 0 then raise exception 'Esta aula é gratuita: reserve sem usar o pacote.'; end if;
  if public.saldo_do_credito(cred) < 1 then raise exception 'Seu pacote não tem aulas disponíveis (sem saldo, vencido ou aguardando Pix).'; end if;
  select * into nova from public.reservar_bike(p_aula, p_bike, cred.nome, cred.telefone);
  update reservas_spinning set status = 'pago', credito_id = cred.id where reservas_spinning.id = nova.id;
  return query select nova.id, nova.codigo;
end;
$$;

-- Quem cancela uma reserva paga com pacote recupera a aula (o saldo é calculado).
create or replace function public.cancelar_minha_reserva(p_id uuid, p_codigo text) returns void
language sql security definer set search_path = public as $$
  update reservas_spinning r set status = 'cancelada'
   where r.id = p_id and r.codigo = upper(p_codigo)
     and (r.status = 'pendente' or (r.credito_id is not null and
          (select a.inicio from aulas_spinning a where a.id = r.aula_id) > now() + interval '2 hours'))
$$;

grant execute on function public.entrar_na_espera(uuid, text, text), public.tamanho_espera(uuid),
  public.comprar_pacote(uuid, text, text), public.meu_pacote(text), public.reservar_com_pacote(uuid, int, text)
  to anon, authenticated;
revoke execute on function public.saldo_do_credito(creditos_spinning) from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- Página de vendas da consultoria online: planos e interessados
-- ---------------------------------------------------------------------------

create table public.planos_consultoria (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null default auth.uid() references public.personais (user_id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 60),
  preco numeric(8, 2) not null check (preco >= 0),
  periodo text not null default 'mês' check (char_length(periodo) <= 20),
  itens text check (char_length(itens) <= 1000), -- um benefício por linha
  destaque boolean not null default false,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.planos_consultoria enable row level security;
create policy "todos veem planos" on public.planos_consultoria for select to anon, authenticated using (true);
create policy "personal gerencia planos" on public.planos_consultoria
  for all to authenticated using (personal_id = auth.uid()) with check (personal_id = auth.uid() and public.eh_personal());

create table public.interessados (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references public.personais (user_id) on delete cascade,
  plano_id uuid references public.planos_consultoria (id) on delete set null,
  nome text not null check (char_length(nome) between 2 and 80),
  telefone text not null check (char_length(telefone) between 8 and 20),
  email text check (char_length(email) <= 120),
  objetivo text check (char_length(objetivo) <= 120),
  mensagem text check (char_length(mensagem) <= 1000),
  status text not null default 'novo' check (status in ('novo', 'conversando', 'fechou', 'nao_fechou')),
  created_at timestamptz not null default now()
);
alter table public.interessados enable row level security;
create policy "personal gerencia interessados" on public.interessados
  for all to authenticated using (personal_id = auth.uid()) with check (personal_id = auth.uid());

-- Dados públicos da página (só de quem ativou a página).
create function public.pagina_vendas()
returns table (personal_id uuid, nome text, titulo text, texto text, instagram text, cref text, telefone text)
language sql stable security definer set search_path = public as $$
  select user_id, nome, venda_titulo, venda_texto, instagram, cref, telefone
    from personais where venda_ativa order by created_at limit 1
$$;

create function public.quero_contratar(p_personal uuid, p_plano uuid, p_nome text, p_telefone text, p_email text, p_objetivo text, p_mensagem text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  tel text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
begin
  if not exists (select 1 from personais where user_id = p_personal and venda_ativa) then raise exception 'Página indisponível.'; end if;
  if char_length(trim(coalesce(p_nome, ''))) < 2 then raise exception 'Informe seu nome.'; end if;
  if char_length(tel) < 10 then raise exception 'Informe um WhatsApp com DDD.'; end if;
  if (select count(*) from interessados where personal_id = p_personal
        and regexp_replace(telefone, '\D', '', 'g') = tel and created_at > now() - interval '1 day') >= 2 then
    raise exception 'Recebemos seu contato. Logo o personal fala com você no WhatsApp.';
  end if;
  insert into interessados (personal_id, plano_id, nome, telefone, email, objetivo, mensagem)
  values (p_personal, (select id from planos_consultoria where id = p_plano and personal_id = p_personal),
          trim(p_nome), trim(p_telefone), nullif(trim(p_email), ''), nullif(trim(p_objetivo), ''), nullif(trim(p_mensagem), ''));
end;
$$;

grant execute on function public.pagina_vendas(), public.quero_contratar(uuid, uuid, text, text, text, text, text) to anon, authenticated;

-- Mensalidade paga pelo Pix automático (Mercado Pago) fica registrada aqui também.
alter table public.pagamentos add column mp_pagamento text;


-- ---------------------------------------------------------------------------
-- Biblioteca de exercícios e nutrição (mesmo conteúdo de migracao-exercicios-nutricao.sql)
-- ---------------------------------------------------------------------------

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


-- ---------------------------------------------------------------------------
-- Agenda, troca de exercício, relatório, feedback, indicação, fases e notificações
-- (mesmo conteúdo de migracao-melhorias.sql)
-- ---------------------------------------------------------------------------


-- Data de nascimento (aniversários no painel); já existe se a migração de cadastro rodou.
alter table public.alunos add column if not exists data_nascimento date;

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

-- "Como foi o treino": nota de esforço (1 a 10) e se sentiu dor. Uma por aluno e dia.
create table if not exists public.feedbacks_treino (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  data date not null,
  treino_id uuid references public.treinos (id) on delete set null,
  esforco int not null check (esforco between 1 and 10),
  dor boolean not null default false,
  dor_local text check (char_length(dor_local) <= 120),
  comentario text check (char_length(comentario) <= 500),
  created_at timestamptz not null default now(),
  unique (aluno_id, data)
);
alter table public.feedbacks_treino enable row level security;
drop policy if exists "personal vê feedbacks" on public.feedbacks_treino;
create policy "personal vê feedbacks" on public.feedbacks_treino
  for select using (public.dono_do_aluno(aluno_id));
drop policy if exists "aluno lê seus feedbacks" on public.feedbacks_treino;
create policy "aluno lê seus feedbacks" on public.feedbacks_treino
  for select using (public.eh_o_aluno(aluno_id));
drop policy if exists "aluno envia feedback" on public.feedbacks_treino;
create policy "aluno envia feedback" on public.feedbacks_treino
  for insert with check (public.eh_o_aluno(aluno_id));
drop policy if exists "aluno corrige feedback" on public.feedbacks_treino;
create policy "aluno corrige feedback" on public.feedbacks_treino
  for update using (public.eh_o_aluno(aluno_id)) with check (public.eh_o_aluno(aluno_id));

-- Indique um amigo: cada aluno tem um código; quem chega pelo link aparece em Vendas com
-- "indicado por". Quando fecha, o personal dá o desconto na mensalidade de quem indicou.
alter table public.alunos add column if not exists codigo_indicacao text unique
  default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
alter table public.personais add column if not exists desconto_indicacao numeric(8, 2) check (desconto_indicacao >= 0);
alter table public.interessados add column if not exists indicado_por uuid references public.alunos (id) on delete set null;

create table if not exists public.descontos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  competencia text not null check (competencia ~ '^[0-9]{4}-[0-9]{2}$'),
  valor numeric(8, 2) not null check (valor > 0),
  motivo text check (char_length(motivo) <= 120),
  interessado_id uuid unique references public.interessados (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.descontos enable row level security;
drop policy if exists "personal gerencia descontos" on public.descontos;
create policy "personal gerencia descontos" on public.descontos
  for all using (public.dono_do_aluno(aluno_id)) with check (public.dono_do_aluno(aluno_id));
drop policy if exists "aluno vê seus descontos" on public.descontos;
create policy "aluno vê seus descontos" on public.descontos
  for select using (public.eh_o_aluno(aluno_id));

-- Primeiro nome de quem indicou, para a página de vendas mostrar "Fulana te indicou".
create or replace function public.quem_indicou(p_codigo text) returns text
language sql stable security definer set search_path = public as $$
  select split_part(trim(nome), ' ', 1) from alunos
   where codigo_indicacao = upper(trim(p_codigo)) and status <> 'pausado' limit 1
$$;

-- Mesmo pedido de contato da página de vendas, guardando quem indicou.
create or replace function public.quero_contratar(p_personal uuid, p_plano uuid, p_nome text, p_telefone text, p_email text, p_objetivo text, p_mensagem text, p_indicacao text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  tel text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
begin
  if not exists (select 1 from personais where user_id = p_personal and venda_ativa) then raise exception 'Página indisponível.'; end if;
  if char_length(trim(coalesce(p_nome, ''))) < 2 then raise exception 'Informe seu nome.'; end if;
  if char_length(tel) < 10 then raise exception 'Informe um WhatsApp com DDD.'; end if;
  if (select count(*) from interessados where personal_id = p_personal
        and regexp_replace(telefone, '\D', '', 'g') = tel and created_at > now() - interval '1 day') >= 2 then
    raise exception 'Recebemos seu contato. Logo o personal fala com você no WhatsApp.';
  end if;
  insert into interessados (personal_id, plano_id, nome, telefone, email, objetivo, mensagem, indicado_por)
  values (p_personal, (select id from planos_consultoria where id = p_plano and personal_id = p_personal),
          trim(p_nome), trim(p_telefone), nullif(trim(p_email), ''), nullif(trim(p_objetivo), ''), nullif(trim(p_mensagem), ''),
          (select id from alunos where personal_id = p_personal and codigo_indicacao = upper(trim(coalesce(p_indicacao, ''))) limit 1));
end;
$$;
grant execute on function public.quem_indicou(text), public.quero_contratar(uuid, uuid, text, text, text, text, text, text) to anon, authenticated;

-- Para a área do aluno: valor do desconto por indicação e se a página de vendas está no ar.
create or replace function public.indicacao_do_personal() returns table (desconto numeric, venda_ativa boolean)
language sql stable security definer set search_path = public as $$
  select desconto_indicacao, venda_ativa from personais where user_id = public.meu_personal()
$$;
grant execute on function public.indicacao_do_personal() to authenticated;

-- Periodização: fases programadas com data de início. Na data, as fichas atuais são arquivadas
-- (o histórico de cargas continua) e as da fase entram no lugar.
-- fichas = [{"nome": "A", "foco": "...", "exercicios": [{"nome", "series", "reps", "carga", "descanso", "obs", "video_url"}]}]
alter table public.treinos add column if not exists arquivado boolean not null default false;
create table if not exists public.fases (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  inicio date not null,
  fichas jsonb not null check (jsonb_typeof(fichas) = 'array'),
  aplicada_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists fases_pendentes_idx on public.fases (aluno_id) where aplicada_em is null;
alter table public.fases enable row level security;
drop policy if exists "personal gerencia fases" on public.fases;
create policy "personal gerencia fases" on public.fases
  for all using (public.dono_do_aluno(aluno_id)) with check (public.dono_do_aluno(aluno_id));
drop policy if exists "aluno vê suas fases" on public.fases;
create policy "aluno vê suas fases" on public.fases
  for select using (public.eh_o_aluno(aluno_id));

-- Troca as fichas das fases que já começaram (do personal logado ou do próprio aluno).
-- O site chama ao abrir o painel, o aluno ou a área do aluno. Devolve quantas fases entraram.
create or replace function public.aplicar_fases() returns int
language plpgsql security definer set search_path = public as $$
declare
  f record; ficha jsonb; t uuid; o int; n int := 0;
begin
  for f in select * from fases
            where aplicada_em is null and inicio <= (now() at time zone 'America/Sao_Paulo')::date
              and (dono_do_aluno(aluno_id) or eh_o_aluno(aluno_id))
            order by inicio, created_at
  loop
    update treinos set arquivado = true where aluno_id = f.aluno_id and not arquivado;
    o := 0;
    for ficha in select value from jsonb_array_elements(f.fichas) loop
      insert into treinos (aluno_id, nome, foco, ordem) values (f.aluno_id, coalesce(nullif(ficha->>'nome', ''), chr(65 + o)), ficha->>'foco', o)
      returning id into t;
      insert into exercicios (treino_id, nome, series, reps, carga, descanso, obs, video_url, metodo, ordem)
      select t, e->>'nome', case when e->>'series' ~ '^\d{1,3}$' then (e->>'series')::int end, e->>'reps', e->>'carga', e->>'descanso',
             nullif(e->>'obs', ''), case when e->>'video_url' ~ '^https://' then e->>'video_url' end,
             case when e->>'metodo' ~ '^[a-z0-9_]{1,30}$' then e->>'metodo' end, (x.ord - 1)::int
        from jsonb_array_elements(coalesce(ficha->'exercicios', '[]')) with ordinality as x(e, ord)
       where coalesce(e->>'nome', '') <> '';
      o := o + 1;
    end loop;
    update fases set aplicada_em = now() where id = f.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;
grant execute on function public.aplicar_fases() to authenticated;

-- Notificações no celular (Web Push). Cada aparelho que ativa vira uma inscrição.
create table if not exists public.push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://'),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_inscricoes enable row level security;
drop policy if exists "cada um gerencia seus aparelhos" on public.push_inscricoes;
create policy "cada um gerencia seus aparelhos" on public.push_inscricoes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Chaves do envio (geradas pela função "notificacoes" na primeira vez). Sem regras de acesso:
-- só a própria função (com a chave de serviço) lê.
create table if not exists public.push_config (
  id int primary key default 1 check (id = 1),
  publica text not null,
  privada text not null
);
alter table public.push_config enable row level security;


-- ===========================================================================
-- Comunidade e troca de ficha (mesmo conteúdo de migracao-comunidade-fichas.sql)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Comentários nos check-ins
-- ---------------------------------------------------------------------------

create table if not exists public.comentarios_checkin (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  autor text,                                   -- preenchido pelo banco (nome do aluno ou do personal)
  do_personal boolean not null default false,   -- idem
  aluno_id uuid references public.alunos (id) on delete cascade, -- idem (para mostrar o avatar)
  texto text not null check (char_length(trim(texto)) between 1 and 280),
  created_at timestamptz not null default now()
);
alter table public.comentarios_checkin add column if not exists aluno_id uuid references public.alunos (id) on delete cascade;
create index if not exists comentarios_checkin_idx on public.comentarios_checkin (checkin_id, created_at);

-- O nome de quem comentou vem do cadastro, não do que o site manda.
create or replace function public.preencher_comentario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p text := (select nome from personais where user_id = auth.uid());
begin
  new.user_id := auth.uid();
  new.do_personal := exists (select 1 from personais where user_id = auth.uid());
  new.aluno_id := case when new.do_personal then null else (select id from alunos where user_id = auth.uid() limit 1) end;
  new.autor := coalesce(p, (select nome from alunos where id = new.aluno_id), case when new.do_personal then 'Personal' else 'Aluno' end);
  new.texto := trim(new.texto);
  return new;
end;
$$;
drop trigger if exists comentario_autor on public.comentarios_checkin;
create trigger comentario_autor before insert on public.comentarios_checkin
  for each row execute function public.preencher_comentario();

alter table public.comentarios_checkin enable row level security;
drop policy if exists "turma vê comentários" on public.comentarios_checkin;
create policy "turma vê comentários" on public.comentarios_checkin
  for select using (public.pode_ver_checkin(public.aluno_do_checkin(checkin_id)));
drop policy if exists "comentar" on public.comentarios_checkin;
create policy "comentar" on public.comentarios_checkin
  for insert with check (user_id = auth.uid() and public.pode_ver_checkin(public.aluno_do_checkin(checkin_id)));
-- Apaga: quem escreveu, o dono do check-in ou o personal.
drop policy if exists "apagar comentário" on public.comentarios_checkin;
create policy "apagar comentário" on public.comentarios_checkin
  for delete using (
    user_id = auth.uid()
    or public.eh_o_aluno(public.aluno_do_checkin(checkin_id))
    or public.dono_do_aluno(public.aluno_do_checkin(checkin_id))
  );

-- ---------------------------------------------------------------------------
-- Avatar do aluno: foto (bucket "avatares") ou um avatar pronto ("p:3")
-- ---------------------------------------------------------------------------

alter table public.alunos add column if not exists avatar text;
alter table public.alunos drop constraint if exists alunos_avatar_check;
alter table public.alunos add constraint alunos_avatar_check
  check (avatar ~ '^(p:[0-9]{1,2}|[0-9a-f-]{36}/[A-Za-z0-9-]+\.jpg)$');

-- O aluno só muda o próprio avatar (e a foto tem que estar na pasta dele).
create or replace function public.definir_avatar(p_avatar text) returns void
language plpgsql security definer set search_path = public as $$
declare
  a uuid := (select id from alunos where user_id = auth.uid() and status <> 'pausado' limit 1);
  v text := nullif(trim(coalesce(p_avatar, '')), '');
begin
  if a is null then raise exception 'Só o aluno muda o avatar.'; end if;
  if v is not null and v !~ '^p:[0-9]{1,2}$' and split_part(v, '/', 1) <> a::text then
    raise exception 'Avatar inválido.';
  end if;
  update alunos set avatar = v where id = a;
end;
$$;
revoke all on function public.definir_avatar(text) from public;
grant execute on function public.definir_avatar(text) to authenticated;

-- Nomes (e agora avatares) da turma para o feed e o ranking.
drop function if exists public.comunidade_membros();
create function public.comunidade_membros() returns table (id uuid, nome text, avatar text)
language sql stable security definer set search_path = public as $$
  select a.id, a.nome, a.avatar from alunos a
   where a.personal_id = auth.uid()
      or (a.comunidade and a.status <> 'pausado' and a.personal_id = public.meu_grupo())
      or a.user_id = auth.uid()
$$;

insert into storage.buckets (id, name, public) values ('avatares', 'avatares', false)
on conflict (id) do nothing;
drop policy if exists "aluno envia avatar" on storage.objects;
create policy "aluno envia avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatares' and public.eh_o_aluno(((storage.foldername(name))[1])::uuid));
drop policy if exists "turma vê avatares" on storage.objects;
create policy "turma vê avatares" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatares' and public.pode_ver_checkin(((storage.foldername(name))[1])::uuid));
drop policy if exists "apagar avatar" on storage.objects;
create policy "apagar avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatares' and (
    public.eh_o_aluno(((storage.foldername(name))[1])::uuid) or public.dono_do_aluno(((storage.foldername(name))[1])::uuid)
  ));

-- ---------------------------------------------------------------------------
-- Aviso de troca de ficha
-- ---------------------------------------------------------------------------

-- De quantas em quantas semanas a ficha deve ser trocada (o personal escolhe em Configurações).
alter table public.personais add column if not exists trocar_ficha_semanas int not null default 6;
alter table public.personais drop constraint if exists personais_trocar_ficha_semanas_check;
alter table public.personais add constraint personais_trocar_ficha_semanas_check check (trocar_ficha_semanas between 2 and 26);
-- "Já revisei a ficha" sem criar ficha nova; e a data da última notificação (para não repetir).
alter table public.alunos add column if not exists ficha_renovada_em date;
alter table public.alunos add column if not exists ficha_avisada_em date;

-- Prazo de troca para a área do aluno (o aluno não lê a tabela de personais).
create or replace function public.prazo_troca_ficha() returns int
language sql stable security definer set search_path = public as $$
  select trocar_ficha_semanas from personais where user_id = public.meu_personal()
$$;
grant execute on function public.prazo_troca_ficha() to authenticated;

-- ---------------------------------------------------------------------------
-- Entrar com Google ou Apple: o nome vem de full_name/name (o resto o aluno ou o personal completa)
-- ---------------------------------------------------------------------------

create or replace function public.vincular_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p uuid;
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  nasc date;
  v_idade int;
  v_nome text := coalesce(nullif(trim(m->>'nome'), ''), nullif(trim(m->>'full_name'), ''), nullif(trim(m->>'name'), '')); -- Google/Apple mandam full_name ou name
  v_tel text := nullif(trim(m->>'telefone'), '');
  v_obj text := nullif(trim(m->>'objetivo'), '');
  v_sexo text := case when m->>'sexo' in ('F', 'M') then m->>'sexo' end;
begin
  if (m->>'nascimento') ~ '^\d{4}-\d{2}-\d{2}$' then
    begin
      nasc := (m->>'nascimento')::date;
      if nasc > current_date or nasc < current_date - interval '110 years' then nasc := null; end if;
    exception when others then nasc := null;
    end;
  end if;
  v_idade := extract(year from age(nasc))::int;
  if v_idade not between 5 and 110 then v_idade := null; end if;

  -- Já cadastrado pelo personal: liga e completa só o que estiver vazio.
  update alunos set
      user_id = new.id,
      data_nascimento = coalesce(data_nascimento, nasc),
      idade = coalesce(idade, v_idade),
      telefone = coalesce(nullif(telefone, ''), v_tel),
      objetivo = coalesce(nullif(objetivo, ''), v_obj)
   where email = lower(new.email) and user_id is null;

  if not found
     and not exists (select 1 from alunos where user_id = new.id)
     and not exists (select 1 from personais where user_id = new.id) then
    select user_id into p from personais order by created_at limit 1;
    if p is not null then
      insert into alunos (personal_id, nome, email, telefone, sexo, data_nascimento, idade, objetivo, status)
      values (p, coalesce(v_nome, split_part(new.email, '@', 1)), new.email, v_tel, coalesce(v_sexo, 'F'),
              nasc, v_idade, v_obj, 'ativo');
    end if;
  end if;
  return new;
end;
$$;


-- ===========================================================================
-- Academia: grade, novidades, WhatsApp, equipes, chat e QR code (mesmo conteúdo de migracao-academia.sql)
-- ===========================================================================


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

-- ===========================================================================
-- Rede social e motivação: reações com emoji, card do treino, conquistas, motivação, vídeos de execução e mensagens com o personal.
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
  check (resumo is null or (jsonb_typeof(resumo) = 'object' and resumo->>'tipo' in ('treino', 'cardio', 'musculacao') and pg_column_size(resumo) < 2000));

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

-- Ranking separado: a lista da turma passa a dizer se o aluno é da academia ou da consultoria online.
drop function if exists public.comunidade_membros();
create function public.comunidade_membros() returns table (id uuid, nome text, avatar text, equipe_id uuid, modalidade text)
language sql stable security definer set search_path = public as $$
  select a.id, a.nome, a.avatar, a.equipe_id, a.modalidade from alunos a
   where a.personal_id = auth.uid()
      or (a.comunidade and a.status <> 'pausado' and a.personal_id = public.meu_grupo())
      or a.user_id = auth.uid()
$$;
grant execute on function public.comunidade_membros() to authenticated;

-- Rotina: equipes automáticas, ofensiva semanal e resumo da semana no celular, aula experimental pela página de vendas.
-- Pode rodar mais de uma vez.

-- ---------------------------------------------------------------------------
-- Equipes automáticas: aluno novo entra na equipe com menos gente (empate: a mais antiga),
-- então os cadastros vão se alternando entre as equipes. O personal ainda pode trocar na mão.
-- ---------------------------------------------------------------------------

create or replace function public.equipe_automatica() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.equipe_id is null then
    select e.id into new.equipe_id from equipes e
     where e.personal_id = new.personal_id
     order by (select count(*) from alunos a where a.equipe_id = e.id and a.status <> 'pausado'), e.created_at, e.id
     limit 1;
  end if;
  return new;
end;
$$;
drop trigger if exists equipe_automatica on public.alunos;
create trigger equipe_automatica before insert on public.alunos
  for each row execute function public.equipe_automatica();

-- ---------------------------------------------------------------------------
-- Ofensiva semanal e resumo da semana: a função de notificações marca quando avisou (uma vez por semana).
-- ---------------------------------------------------------------------------

alter table public.alunos add column if not exists resumo_semana_em date;
alter table public.alunos add column if not exists ofensiva_avisada_em date;

-- Dias com treino ou check-in de cada aluno (só a função de notificações usa, com a chave de serviço).
create or replace function public.dias_treinados(p_desde date) returns table (aluno_id uuid, data date)
language sql stable security definer set search_path = public as $$
  select aluno_id, data from registros where data >= p_desde
  union
  select aluno_id, data from checkins where data >= p_desde
  order by 1, 2
$$;
revoke execute on function public.dias_treinados(date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Aula experimental: o personal escolhe os horários livres (dia da semana + hora) e a pessoa
-- marca pela página de vendas. Vira um interessado com data e hora, e aparece na Agenda.
-- ---------------------------------------------------------------------------

alter table public.personais add column if not exists experimental_horarios jsonb not null default '[]'::jsonb;
alter table public.interessados add column if not exists experimental_data date;
alter table public.interessados add column if not exists experimental_hora time;
create index if not exists interessados_experimental_idx on public.interessados (personal_id, experimental_data) where experimental_data is not null;

-- Horários livres dos próximos 14 dias (a partir de amanhã), sem os já marcados.
create or replace function public.horarios_experimental(p_personal uuid) returns table (data date, hora text)
language sql stable security definer set search_path = public as $$
  with p as (
    select experimental_horarios h from personais where user_id = p_personal and venda_ativa
  ), dias as (
    select ((now() at time zone 'America/Sao_Paulo')::date + k) as d from generate_series(1, 14) k
  )
  select dias.d, s->>'hora'
    from p, dias, jsonb_array_elements(p.h) s
   where (s->>'dia')::int = extract(dow from dias.d)::int
     and s->>'hora' ~ '^\d{2}:\d{2}$'
     and not exists (
       select 1 from interessados i
        where i.personal_id = p_personal and i.experimental_data = dias.d
          and to_char(i.experimental_hora, 'HH24:MI') = s->>'hora' and i.status <> 'nao_fechou')
   order by 1, 2
$$;

create or replace function public.marcar_experimental(p_personal uuid, p_nome text, p_telefone text, p_objetivo text, p_data date, p_hora text, p_indicacao text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  tel text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
begin
  if char_length(trim(coalesce(p_nome, ''))) < 2 then raise exception 'Informe seu nome.'; end if;
  if char_length(tel) < 10 then raise exception 'Informe um WhatsApp com DDD.'; end if;
  if not exists (select 1 from public.horarios_experimental(p_personal) h where h.data = p_data and h.hora = p_hora) then
    raise exception 'Esse horário acabou de ser preenchido. Escolha outro.';
  end if;
  if (select count(*) from interessados where personal_id = p_personal
        and regexp_replace(telefone, '\D', '', 'g') = tel and created_at > now() - interval '1 day') >= 2 then
    raise exception 'Recebemos seu pedido. Logo o personal fala com você no WhatsApp.';
  end if;
  insert into interessados (personal_id, nome, telefone, objetivo, mensagem, experimental_data, experimental_hora, indicado_por)
  values (p_personal, trim(p_nome), trim(p_telefone), nullif(trim(coalesce(p_objetivo, '')), ''), 'Aula experimental', p_data, p_hora::time,
          (select id from alunos where personal_id = p_personal and codigo_indicacao = upper(trim(coalesce(p_indicacao, ''))) limit 1));
end;
$$;
grant execute on function public.horarios_experimental(uuid), public.marcar_experimental(uuid, text, text, text, date, text, text) to anon, authenticated;
