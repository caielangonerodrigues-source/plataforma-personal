-- O aluno muda o próprio objetivo (escrito no cadastro) na aba Conta. O banco só deixa mudar esse campo.
-- Pode rodar mais de uma vez.

create or replace function public.definir_meu_objetivo(p_objetivo text) returns void
language plpgsql security definer set search_path = public as $$
declare
  a uuid := (select id from alunos where user_id = auth.uid() and status <> 'pausado' limit 1);
  v text := nullif(left(regexp_replace(trim(coalesce(p_objetivo, '')), '\s+', ' ', 'g'), 120), '');
begin
  if a is null then raise exception 'Só o aluno muda o próprio objetivo.'; end if;
  update alunos set objetivo = v where id = a;
end;
$$;
revoke all on function public.definir_meu_objetivo(text) from public;
grant execute on function public.definir_meu_objetivo(text) to authenticated;
