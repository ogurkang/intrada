-- Faaliyet alt programa, alt program hedefi faaliyete bağlanır.
-- Bir kez çalıştırın.

alter table public.performans_programi_pf_faaliyet
  add column if not exists alt_program_id bigint references public.performans_programi_alt_program(id) on delete cascade;

alter table public.performans_programi_pf_faaliyet
  alter column bag_id drop not null;

alter table public.performans_programi_alt_program_hedef
  add column if not exists faaliyet_id bigint references public.performans_programi_pf_faaliyet(id) on delete cascade;

alter table public.performans_programi_alt_program_hedef
  add column if not exists secilen_mudurluk text;

create unique index if not exists uq_pp_pf_faaliyet_alt_sira
  on public.performans_programi_pf_faaliyet (alt_program_id, sira_no)
  where alt_program_id is not null;
