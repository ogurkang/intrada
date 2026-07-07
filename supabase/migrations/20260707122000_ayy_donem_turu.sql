-- AYY dönemlerine tür (normal/fark) ekler; geçmiş kayıtları normal yapar
ALTER TABLE public.aylik_yemek_yeni_donem
  ADD COLUMN IF NOT EXISTS donem_turu text;

UPDATE public.aylik_yemek_yeni_donem
SET donem_turu = 'normal'
WHERE donem_turu IS NULL OR btrim(donem_turu) = '';

ALTER TABLE public.aylik_yemek_yeni_donem
  ALTER COLUMN donem_turu SET DEFAULT 'normal',
  ALTER COLUMN donem_turu SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'aylik_yemek_yeni_donem_donem_turu_check'
  ) THEN
    ALTER TABLE public.aylik_yemek_yeni_donem
      ADD CONSTRAINT aylik_yemek_yeni_donem_donem_turu_check
      CHECK (donem_turu IN ('normal','fark'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ayy_donem_turu_idx
  ON public.aylik_yemek_yeni_donem (donem_turu, baslangic_tarihi DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ayy_donem_unique_yil_sira_tur
  ON public.aylik_yemek_yeni_donem (yil, COALESCE(sira_no, ''), donem_turu);

COMMENT ON COLUMN public.aylik_yemek_yeni_donem.donem_turu IS
  'AYY dönem türü: normal veya fark. Önceki dönem zinciri aynı tür içinde işler.';
