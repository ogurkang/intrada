insert into public.rapor_tanim (kod, slug, baslik, aciklama, renk, olusturulma_tarihi, kapsam_tipi) values
  ('GYI', 'gorev-yerine-gore-iletisim-bilgileri', 'Görev Yerine Göre İletişim Bilgileri', 'Görev yerine göre personel listesi sırasıyla telefon numaraları; müdürlük filtresi ve Excel.', 'border-rose-200 bg-rose-50 text-rose-900', '2026-08-20', 'ayar_liste')
on conflict (kod) do update set
  slug = excluded.slug,
  baslik = excluded.baslik,
  aciklama = excluded.aciklama,
  renk = excluded.renk,
  olusturulma_tarihi = excluded.olusturulma_tarihi,
  kapsam_tipi = excluded.kapsam_tipi,
  aktif = true;
