-- Unvan metinlerindeki büyük "Ve" bağlacını müdürlük adlarıyla uyumlu küçük "ve" yap.
-- Örn: "İnsan Kaynakları Ve Eğitim Müdürü" → "İnsan Kaynakları ve Eğitim Müdürü"
-- Performans amir eşlemesi kodda da normalize ediliyor; bu migration veri tutarlılığı içindir.

UPDATE public.tanim_unvan
SET unvan_adi = replace(unvan_adi, ' Ve ', ' ve ')
WHERE unvan_adi LIKE '% Ve %';

UPDATE public.kadro_hareketleri
SET
  kadro_unvani = replace(kadro_unvani, ' Ve ', ' ve '),
  gorev_unvani = replace(gorev_unvani, ' Ve ', ' ve ')
WHERE kadro_unvani LIKE '% Ve %'
   OR gorev_unvani LIKE '% Ve %';
