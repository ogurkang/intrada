-- ROLLBACK (manuel): AYY dönem türü geliştirmesini geri alır.
-- UYARI: Bu script, sadece donem_turu alanını kaldırır; uygulama kodunu da eski sürüme dönmelisiniz.

DROP INDEX IF EXISTS public.ayy_donem_unique_yil_sira_tur;
DROP INDEX IF EXISTS public.ayy_donem_turu_idx;

ALTER TABLE public.aylik_yemek_yeni_donem
  DROP CONSTRAINT IF EXISTS aylik_yemek_yeni_donem_donem_turu_check;

ALTER TABLE public.aylik_yemek_yeni_donem
  DROP COLUMN IF EXISTS donem_turu;
