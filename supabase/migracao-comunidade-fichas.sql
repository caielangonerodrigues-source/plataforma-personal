-- Comunidade (comentários nos check-ins e avatar do aluno) e aviso de troca de ficha.
-- Rode depois do schema.sql (Supabase > SQL Editor > New query > cole tudo > Run). Pode rodar mais de uma vez.

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
