-- Aluno edita o próprio nome (aba Conta). Só muda o nome; o resto do cadastro continua com o personal.
-- Pode rodar mais de uma vez.

create or replace function public.definir_meu_nome(p_nome text) returns void
language plpgsql security definer set search_path = public as $$
declare
  a uuid := (select id from alunos where user_id = auth.uid() and status <> 'pausado' limit 1);
  v text := regexp_replace(trim(coalesce(p_nome, '')), '\s+', ' ', 'g');
begin
  if a is null then raise exception 'Só o aluno muda o próprio nome.'; end if;
  if char_length(v) < 2 or char_length(v) > 60 then raise exception 'Nome inválido.'; end if;
  update alunos set nome = v where id = a;
end;
$$;
revoke all on function public.definir_meu_nome(text) from public;
grant execute on function public.definir_meu_nome(text) to authenticated;
