-- Alt program hedefi (bag) için serbest metin açıklama.
alter table public.performans_programi_alt_program_hedef
  add column if not exists hedef_aciklama text not null default '';
