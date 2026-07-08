-- Pasaport: çalışan / ayrılan (emekli|istifa) desteği
-- Ayrılanlar calisan tablosunda olmayabilir → sicil_no FK kaldırılır.

ALTER TABLE public.pasaport_islemleri
  DROP CONSTRAINT IF EXISTS pasaport_islemleri_sicil_no_fkey;

ALTER TABLE public.pasaport_islemleri
  ALTER COLUMN sicil_no DROP NOT NULL;

ALTER TABLE public.pasaport_islemleri
  ADD COLUMN IF NOT EXISTS personel_durum text;

ALTER TABLE public.pasaport_islemleri
  ADD COLUMN IF NOT EXISTS ayrilis_nedeni text;

UPDATE public.pasaport_islemleri
SET personel_durum = 'calisan'
WHERE personel_durum IS NULL OR btrim(personel_durum) = '';

ALTER TABLE public.pasaport_islemleri
  ALTER COLUMN personel_durum SET DEFAULT 'calisan',
  ALTER COLUMN personel_durum SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pasaport_islemleri_personel_durum_check'
  ) THEN
    ALTER TABLE public.pasaport_islemleri
      ADD CONSTRAINT pasaport_islemleri_personel_durum_check
      CHECK (personel_durum IN ('calisan', 'ayrilan'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pasaport_islemleri_ayrilis_nedeni_check'
  ) THEN
    ALTER TABLE public.pasaport_islemleri
      ADD CONSTRAINT pasaport_islemleri_ayrilis_nedeni_check
      CHECK (ayrilis_nedeni IS NULL OR ayrilis_nedeni IN ('emekli', 'istifa'));
  END IF;
END $$;

COMMENT ON COLUMN public.pasaport_islemleri.personel_durum IS
  'calisan: aktif personelden seçilir; ayrilan: manuel ad/soyad/kadro/derece/tc.';
COMMENT ON COLUMN public.pasaport_islemleri.ayrilis_nedeni IS
  'Yalnızca personel_durum=ayrilan için: emekli veya istifa.';
