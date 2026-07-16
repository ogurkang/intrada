-- Performans dönem: AYY benzeri alanlar + müdürlük bazlı değerlendirme

alter table public.performans_donem
  add column if not exists sira_no text null,
  add column if not exists donem_adi text null,
  add column if not exists baslangic_tarihi date null,
  add column if not exists bitis_tarihi date null,
  add column if not exists kapatildi_at timestamptz null;

update public.performans_donem
set
  sira_no = coalesce(sira_no, yil::text || '/1'),
  donem_adi = coalesce(donem_adi, yil::text || ' Performans Dönemi'),
  baslangic_tarihi = coalesce(baslangic_tarihi, make_date(yil, 1, 1)),
  bitis_tarihi = coalesce(bitis_tarihi, make_date(yil, 12, 31))
where sira_no is null
   or donem_adi is null
   or baslangic_tarihi is null
   or bitis_tarihi is null;

alter table public.performans_donem
  alter column baslangic_tarihi set not null,
  alter column bitis_tarihi set not null;

alter table public.performans_donem
  drop constraint if exists performans_donem_yil_key;

alter table public.performans_degerlendirme
  add column if not exists mudurluk_adi text null;

create index if not exists idx_perf_deg_mud on public.performans_degerlendirme (mudurluk_adi);

comment on column public.performans_donem.sira_no is 'Yıl içi sıra (örn. 2026/1)';
comment on column public.performans_degerlendirme.mudurluk_adi is 'Personelin kadro müdürlüğü (admin filtreleme)';
