-- Denetim: İnsan Kaynakları Bilgileri bölümü

alter table public.denetim_bolum_baslik
  drop constraint if exists denetim_bolum_baslik_bolum_check;

alter table public.denetim_bolum_baslik
  add constraint denetim_bolum_baslik_bolum_check
  check (bolum in ('mali', 'performans', 'ic_kontrol', 'insan_kaynaklari'));

notify pgrst, 'reload schema';
