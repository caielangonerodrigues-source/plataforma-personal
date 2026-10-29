-- Agenda, troca de exercício, relatório mensal, "como foi o treino", indique um amigo,
-- periodização (fases) e notificações no celular.
-- Rode depois do schema.sql (Supabase > SQL Editor > New query > cole tudo > Run). Pode rodar mais de uma vez.

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
      insert into exercicios (treino_id, nome, series, reps, carga, descanso, obs, video_url, ordem)
      select t, e->>'nome', case when e->>'series' ~ '^\d{1,3}$' then (e->>'series')::int end, e->>'reps', e->>'carga', e->>'descanso',
             nullif(e->>'obs', ''), case when e->>'video_url' ~ '^https://' then e->>'video_url' end, (x.ord - 1)::int
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
