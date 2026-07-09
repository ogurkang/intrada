-- Pasaport dilekçesi: telefon (çalışan kaydından veya ayrılan için manuel)

ALTER TABLE public.pasaport_islemleri
  ADD COLUMN IF NOT EXISTS telefon text;

COMMENT ON COLUMN public.pasaport_islemleri.telefon IS
  'Dilekçe alt bilgisi: çalışan için calisan.telefon; ayrılan için formdan girilir.';
