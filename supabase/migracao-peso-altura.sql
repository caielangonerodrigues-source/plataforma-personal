-- Peso e altura no cadastro do aluno. O aluno informa e atualiza na aba Conta; o personal vê na página do aluno.
-- Pode rodar mais de uma vez.

alter table public.alunos add column if not exists peso numeric(5, 1) check (peso between 20 and 350);
alter table public.alunos add column if not exists altura numeric(3, 2) check (altura between 0.8 and 2.5);
alter table public.alunos add column if not exists peso_altura_em timestamptz;

create or replace function public.definir_meu_peso_altura(p_peso numeric, p_altura numeric) returns void
language plpgsql security definer set search_path = public as $$
declare
  a uuid := (select id from alunos where user_id = auth.uid() and status <> 'pausado' limit 1);
begin
  if a is null then raise exception 'Só o aluno muda o próprio peso e altura.'; end if;
  if p_peso is not null and (p_peso < 20 or p_peso > 350) then raise exception 'Peso inválido.'; end if;
  if p_altura is not null and (p_altura < 0.8 or p_altura > 2.5) then raise exception 'Altura inválida.'; end if;
  update alunos set peso = round(p_peso, 1), altura = round(p_altura, 2), peso_altura_em = now() where id = a;
end;
$$;
revoke all on function public.definir_meu_peso_altura(numeric, numeric) from public;
grant execute on function public.definir_meu_peso_altura(numeric, numeric) to authenticated;
