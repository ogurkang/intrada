alter table public.performans_programi_faaliyet_butce
  add column if not exists cari_yil_butce numeric,
  add column if not exists cari_yil_haziran_sonu numeric,
  add column if not exists cari_yil_yil_sonu_tahmin numeric,
  add column if not exists sonraki_yil_butce_1 numeric,
  add column if not exists sonraki_yil_butce_2 numeric,
  add column if not exists sonraki_yil_butce_3 numeric;
