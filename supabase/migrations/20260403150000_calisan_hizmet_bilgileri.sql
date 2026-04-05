-- Hizmet bilgileri: tarihler kadro ile birlikte kullanılabilir; süre 360 gün yılı (30 günlük ay) üzerinden.
alter table public.calisan
  add column if not exists memuriyet_tarihi date,
  add column if not exists kuruma_giris_tarihi date,
  add column if not exists hizmet_suresi_yil smallint not null default 0,
  add column if not exists hizmet_suresi_ay smallint not null default 0,
  add column if not exists hizmet_suresi_gun smallint not null default 0;

comment on column public.calisan.memuriyet_tarihi is 'Kadro yokken veya yedek; ana kadro varsa kadro satırı ile uyumlu tutulur.';
comment on column public.calisan.kuruma_giris_tarihi is 'Kadro yokken veya yedek; ana kadro varsa kadro satırı ile uyumlu tutulur.';
comment on column public.calisan.hizmet_suresi_yil is '360 gün esasına göre yıl bileşeni';
comment on column public.calisan.hizmet_suresi_ay is '360 gün esasına göre ay bileşeni (30 günlük ay)';
comment on column public.calisan.hizmet_suresi_gun is '360 gün esasına göre gün bileşeni';
