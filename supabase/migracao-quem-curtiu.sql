-- Quem curtiu: ao tocar nas reações de uma foto ou post, aparece a lista com o nome e o avatar de cada pessoa.
-- As curtidas só guardam o login (user_id); esta função devolve o nome e o avatar dos alunos da turma
-- que já reagiram a algo (os personais já vêm de personais_do_grupo). Pode rodar mais de uma vez.

create or replace function public.quem_reagiu() returns table (user_id uuid, nome text, avatar text)
language sql stable security definer set search_path = public as $$
  select distinct on (a.user_id) a.user_id, a.nome, a.avatar from alunos a
   where a.user_id is not null
     and (a.personal_id = public.meu_grupo() or a.user_id = auth.uid())
     and (a.user_id = auth.uid()
          or exists (select 1 from curtidas k where k.user_id = a.user_id)
          or exists (select 1 from reacoes_conquista r where r.user_id = a.user_id))
   order by a.user_id, a.status = 'pausado'
$$;
revoke all on function public.quem_reagiu() from public;
grant execute on function public.quem_reagiu() to authenticated;
