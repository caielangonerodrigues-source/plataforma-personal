-- Perfil de cada personal da equipe. Depois de supabase/migracao-equipe-localizacao.sql, quem não é o dono
-- só enxerga o cadastro do dono (a academia), então nome, WhatsApp e foto de cada um vêm por estas funções.
-- O Pix das mensalidades continua sendo da academia e só o dono muda. Pode rodar mais de uma vez.

create or replace function public.meu_perfil()
returns table (user_id uuid, nome text, telefone text, avatar text, dono boolean)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.nome, p.telefone, p.avatar, p.equipe_de is null
  from personais p where p.user_id = auth.uid()
$$;
revoke all on function public.meu_perfil() from public;
grant execute on function public.meu_perfil() to authenticated;

create or replace function public.salvar_meu_perfil(p_nome text, p_telefone text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_personal() then raise exception 'Só o personal muda este perfil.'; end if;
  update personais set nome = nullif(left(trim(coalesce(p_nome, '')), 80), ''),
                       telefone = nullif(left(trim(coalesce(p_telefone, '')), 30), '')
   where user_id = auth.uid();
end;
$$;
revoke all on function public.salvar_meu_perfil(text, text) from public;
grant execute on function public.salvar_meu_perfil(text, text) to authenticated;

-- Só o dono muda a chave Pix e o próprio nome e WhatsApp (os outros personais editam o resto da academia).
create or replace function public.proteger_cadastro_do_dono() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and auth.uid() <> new.user_id
     and (new.pix_chave, new.pix_nome, new.pix_cidade, new.nome, new.telefone, new.avatar)
         is distinct from (old.pix_chave, old.pix_nome, old.pix_cidade, old.nome, old.telefone, old.avatar) then
    raise exception 'Só o dono da conta muda o Pix e os dados dele.';
  end if;
  return new;
end;
$$;
drop trigger if exists personais_proteger_dono on public.personais;
create trigger personais_proteger_dono before update on public.personais
  for each row execute function public.proteger_cadastro_do_dono();
