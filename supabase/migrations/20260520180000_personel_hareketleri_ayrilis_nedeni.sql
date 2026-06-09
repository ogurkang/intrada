-- Personel hareketleri: ayrılış nedeni (Tanımlar > Hareket Tanımları, tür = Gidiş)

ALTER TABLE public.personel_hareketleri
  ADD COLUMN IF NOT EXISTS ayrilis_nedeni text;

COMMENT ON COLUMN public.personel_hareketleri.ayrilis_nedeni IS
  'Ayrılış nedeni; tanim_hareket_tanim (tur=Gidiş) tip değeri. ayrilis_tarihi ile birlikte doldurulmalıdır.';

-- Mevcut kayıtlar: açıklama alanı geçerli bir Gidiş tipi ise nedeni doldur
UPDATE public.personel_hareketleri ph
SET ayrilis_nedeni = ph.aciklama
WHERE ph.ayrilis_tarihi IS NOT NULL
  AND ph.ayrilis_nedeni IS NULL
  AND ph.aciklama IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.tanim_hareket_tanim t
    WHERE t.tur = 'Gidiş'
      AND t.tip = ph.aciklama
      AND t.aktif = true
  );
