-- V.H.K.İ. ve Bilgisayar İşletmeni: yan ödeme iki sütun
--   yan_odeme               → Bilgisayarlı Yan Ödeme (mevcut puanlar burada kalır)
--   yan_odeme_bilgisayarsiz → Bilgisayarsız Yan Ödeme (öğrenim/derece satırları 1000)

ALTER TABLE public.tanim_kazanc_bilgisi
  ADD COLUMN IF NOT EXISTS yan_odeme_bilgisayarsiz text;

UPDATE public.tanim_kazanc_bilgisi k
SET yan_odeme_bilgisayarsiz = '1000'
FROM public.tanim_unvan u
WHERE k.unvan_id = u.id
  AND regexp_replace(
        upper(translate(u.unvan_adi, 'ıİiIşŞğĞüÜöÖçÇ', 'IIIIISSGCUUOOC')),
        '[^A-Z0-9]',
        '',
        'g'
      ) IN ('VHKI', 'BILGISAYARISLETMENI')
  AND (k.yan_odeme_bilgisayarsiz IS NULL OR btrim(k.yan_odeme_bilgisayarsiz) = '');
