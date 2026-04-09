-- AYY dönem kapatılma zamanı: havuz A eşiği ve «arada kalan» izin hesabı için.
ALTER TABLE public.aylik_yemek_yeni_donem
  ADD COLUMN IF NOT EXISTS kapatildi_at timestamptz NULL;

COMMENT ON COLUMN public.aylik_yemek_yeni_donem.kapatildi_at IS
  'Dönem Kapalı yapıldığında set edilir; Açık iken NULL. AYY havuz A ve gecikmiş kayıt kesintisi için kullanılır.';
