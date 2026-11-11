-- Performans programı faaliyetlerine kod alanı.
alter table public.performans_programi_pf_faaliyet
  add column if not exists kodu text not null default '';
