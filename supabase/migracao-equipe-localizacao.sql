-- 1) Equipe da academia: todos os personais trabalham com os mesmos alunos.
-- O primeiro personal cadastrado é o dono; quem tem personais.equipe_de preenchido enxerga e edita tudo do dono:
-- alunos, treinos, avaliações, agenda, academia, spinning, financeiro e comunidade.
-- Todo personal liberado depois entra automaticamente na equipe do dono. Pode rodar mais de uma vez.

alter table public.personais add column if not exists equipe_de uuid references public.personais (user_id) on delete set null;

-- Dono dos dados de quem está logado: o próprio personal, ou o personal de quem ele é da equipe.
-- Para aluno (ou ninguém logado) devolve null, então as regras continuam valendo só para personais.
create or replace function public.dono_da_equipe() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(equipe_de, user_id) from personais where user_id = auth.uid()
$$;

-- Turma da comunidade: para o personal da equipe, a turma do dono.
create or replace function public.meu_grupo() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    public.dono_da_equipe(),
    (select personal_id from alunos where user_id = auth.uid() and status <> 'pausado' and comunidade)
  )
$$;

do $$
declare
  r record;
  usando text;
  checando text;
  def text;
begin
  -- 1. Linhas novas criadas pela equipe ficam no nome do dono.
  for r in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'personal_id' and column_default like '%auth.uid()%'
  loop
    execute format('alter table public.%I alter column personal_id set default public.dono_da_equipe()', r.table_name);
  end loop;

  -- 2. Regras de acesso: "personal_id = auth.uid()" passa a ser "personal_id = dono_da_equipe()".
  for r in
    select tablename, policyname, qual, with_check from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') like '%personal_id = auth.uid()%' or coalesce(with_check, '') like '%personal_id = auth.uid()%')
  loop
    usando := replace(r.qual, 'personal_id = auth.uid()', 'personal_id = public.dono_da_equipe()');
    checando := replace(r.with_check, 'personal_id = auth.uid()', 'personal_id = public.dono_da_equipe()');
    execute format('alter policy %I on public.%I', r.policyname, r.tablename)
      || case when usando is not null then format(' using (%s)', usando) else '' end
      || case when checando is not null then format(' with check (%s)', checando) else '' end;
  end loop;

  -- 3. Funções do site com a mesma checagem (ex.: dono_do_aluno).
  for r in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosrc like '%personal_id = auth.uid()%' and p.proname <> 'dono_da_equipe'
  loop
    def := replace(pg_get_functiondef(r.oid), 'personal_id = auth.uid()', 'personal_id = public.dono_da_equipe()');
    execute def;
  end loop;
end $$;

-- Cadastro da academia (Pix, QR code, grupo do WhatsApp, página de vendas, configurações): a equipe usa o do dono.
-- Cada personal da equipe enxerga e edita só o cadastro do dono, como se fosse uma conta só.
alter policy "personal vê o próprio cadastro" on public.personais using (user_id = public.dono_da_equipe());
alter policy "personal edita o próprio cadastro" on public.personais
  using (user_id = public.dono_da_equipe()) with check (user_id = public.dono_da_equipe());

-- Fotos que a equipe posta no feed ficam na pasta do dono (a turma lê dessa pasta).
drop policy if exists "equipe envia foto do post" on storage.objects;
create policy "equipe envia foto do post" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'checkins' and (storage.foldername(name))[1] = public.dono_da_equipe()::text and public.eh_personal());
drop policy if exists "equipe apaga foto do post" on storage.objects;
create policy "equipe apaga foto do post" on storage.objects
  for delete to authenticated
  using (bucket_id = 'checkins' and (storage.foldername(name))[1] = public.dono_da_equipe()::text);

-- Todo personal novo entra na equipe do dono (o personal mais antigo que não é de equipe nenhuma).
create or replace function public.entrar_na_equipe() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.equipe_de is null then
    new.equipe_de := (select user_id from personais where equipe_de is null and user_id <> new.user_id order by created_at limit 1);
  end if;
  return new;
end $$;
drop trigger if exists personais_entrar_na_equipe on public.personais;
create trigger personais_entrar_na_equipe before insert on public.personais
  for each row execute function public.entrar_na_equipe();

-- Quem já era personal (além do dono) passa a ver os alunos do dono.
update public.personais p set equipe_de = d.user_id
from (select user_id from public.personais where equipe_de is null order by created_at limit 1) d
where p.equipe_de is null and p.user_id <> d.user_id;

-- ---------------------------------------------------------------------------
-- 2) Localização no check-in: o personal salva o ponto da academia (Academia › Localização da academia);
-- o check-in feito perto dele mostra "Corpo Atlético", fora dele o bairro e a cidade.
-- Só o nome do lugar fica salvo no check-in, nunca as coordenadas do aluno.
-- ---------------------------------------------------------------------------
alter table public.personais add column if not exists academia_lat double precision;
alter table public.personais add column if not exists academia_lng double precision;
alter table public.checkins add column if not exists local text;
alter table public.checkins drop constraint if exists checkins_local_check;
alter table public.checkins add constraint checkins_local_check check (char_length(local) <= 80);

-- O aluno não lê a tabela de personais: o ponto da academia vem por aqui.
create or replace function public.local_da_academia() returns table (lat double precision, lng double precision)
language sql stable security definer set search_path = public as $$
  select academia_lat, academia_lng from personais where user_id = coalesce(public.dono_da_equipe(), public.meu_personal())
$$;
revoke all on function public.local_da_academia() from public;
grant execute on function public.local_da_academia() to authenticated;

-- Check-in pelo QR code da recepção já sai com o local da academia.
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
  insert into checkins (aluno_id, data, titulo, local) values (a.id, hoje, 'Na academia', 'Corpo Atlético');
  return 'feito';
end;
$$;
revoke all on function public.checkin_qr(text) from public;
grant execute on function public.checkin_qr(text) to authenticated;

-- Para liberar um personal novo (a pessoa precisa ter criado a conta no site antes):
-- insert into personais (user_id, nome)
-- select id, 'Nome da pessoa' from auth.users where email = 'email.da.pessoa@gmail.com';
