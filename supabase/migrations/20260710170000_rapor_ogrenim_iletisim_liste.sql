insert into public.rapor_tanim (kod, slug, baslik, aciklama, renk, olusturulma_tarihi, kapsam_tipi) values
  ('ODI', 'ogrenim-durumuna-gore-iletisim-bilgileri-liste', 'Öğrenim Durumuna Göre İletişim Bilgileri Listesi', 'Öğrenim durumuna göre personel listesine cep telefonu ve e-posta eklenir; YILLIK ve aylık sekmeler, müdürlük filtresi ve Excel.', 'border-sky-200 bg-sky-50 text-sky-900', '2026-07-10', 'yok')
on conflict (kod) do update set
  slug = excluded.slug,
  baslik = excluded.baslik,
  aciklama = excluded.aciklama,
  renk = excluded.renk,
  olusturulma_tarihi = excluded.olusturulma_tarihi,
  kapsam_tipi = excluded.kapsam_tipi,
  aktif = true;
