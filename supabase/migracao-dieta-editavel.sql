-- Diário da dieta: o aluno edita o que comeu de verdade numa refeição do plano (tirou, trocou ou mudou os gramas).
-- Os itens editados ficam nesta coluna e o contador de macros usa eles no lugar do plano. Pode rodar mais de uma vez.
alter table public.diario_dieta add column if not exists itens jsonb;
alter table public.diario_dieta drop constraint if exists diario_dieta_itens_check;
alter table public.diario_dieta add constraint diario_dieta_itens_check
  check (itens is null or (jsonb_typeof(itens) = 'array' and jsonb_array_length(itens) <= 30 and pg_column_size(itens) < 8000));
