alter table public.calisan
  add column if not exists gorev_turu_aciklama text;

comment on column public.calisan.gorev_turu_aciklama is
  'Geçici görevlendirme seçiliyse tarih sonrası serbest metin açıklaması';
