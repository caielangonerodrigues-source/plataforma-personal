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

-- ---------------------------------------------------------------------------
-- Check-in de musculação (sem ficha): o card do post guarda os grupos treinados e a duração.
-- ---------------------------------------------------------------------------

alter table public.checkins drop constraint if exists checkins_resumo_check;
alter table public.checkins add constraint checkins_resumo_check
  check (resumo is null or (jsonb_typeof(resumo) = 'object' and resumo->>'tipo' in ('treino', 'cardio', 'musculacao') and pg_column_size(resumo) < 2000));
