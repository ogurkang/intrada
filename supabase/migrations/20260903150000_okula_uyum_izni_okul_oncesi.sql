-- Okula uyum izni: Okul Öncesi sınıf seçeneği

alter table public.okula_uyum_izni_bildirimleri
  drop constraint if exists okula_uyum_izni_sinif_chk;

alter table public.okula_uyum_izni_bildirimleri
  add constraint okula_uyum_izni_sinif_chk
  check (baslayacagi_sinif in ('Okul Öncesi', '1. Sınıf', '5. Sınıf'));
