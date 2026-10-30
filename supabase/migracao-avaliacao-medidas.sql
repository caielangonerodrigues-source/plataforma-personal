-- Avaliação física com todos os perímetros (ombros, peitoral, abdômen, panturrilha, lados direito e esquerdo).
-- Ficam em cm na coluna medidas; cintura, quadril, braço e coxa continuam também nas colunas antigas. Pode rodar mais de uma vez.
alter table public.avaliacoes add column if not exists medidas jsonb;
alter table public.avaliacoes drop constraint if exists avaliacoes_medidas_check;
alter table public.avaliacoes add constraint avaliacoes_medidas_check
  check (medidas is null or (jsonb_typeof(medidas) = 'object' and pg_column_size(medidas) < 2000));
