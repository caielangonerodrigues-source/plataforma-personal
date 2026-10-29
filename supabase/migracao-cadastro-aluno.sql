-- Cadastro do aluno pelo próprio aluno em "Primeiro acesso".
-- Rode depois do schema.sql (Supabase > SQL Editor). Pode rodar mais de uma vez.

alter table public.alunos add column if not exists data_nascimento date;

-- Quando alguém cria a conta: liga ao cadastro feito pelo personal (mesmo e-mail)
-- ou, se não existir, cria o cadastro do aluno com os dados do formulário.
create or replace function public.vincular_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p uuid;
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  nasc date;
  v_idade int;
  v_nome text := nullif(trim(m->>'nome'), '');
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
