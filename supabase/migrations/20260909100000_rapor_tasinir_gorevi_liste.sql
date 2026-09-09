insert into public.rapor_tanim (kod, slug, baslik, aciklama, renk, olusturulma_tarihi, kapsam_tipi) values
  (
    'TGL',
    'tasinir-gorevi-olan-personel-liste',
    'Taşınır Görevi Olan Personel Listesi',
    'Görevlendirme Bilgileri’nde Taşınır Görevi dolu olan aktif personel; YILLIK ve aylık sekmeler, Excel.',
    'border-teal-200 bg-teal-50 text-teal-900',
    '2026-09-09',
    'yok'
  )
on conflict (kod) do update set
  slug = excluded.slug,
  baslik = excluded.baslik,
  aciklama = excluded.aciklama,
  renk = excluded.renk,
  olusturulma_tarihi = excluded.olusturulma_tarihi,
  kapsam_tipi = excluded.kapsam_tipi,
  aktif = true;
