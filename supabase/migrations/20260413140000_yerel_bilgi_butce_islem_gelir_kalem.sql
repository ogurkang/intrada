-- Tahmin / gerçekleşme satırları: gider VEYA gelir kalemi (tek satırda biri)

ALTER TABLE public.yerel_bilgi_butce_tahmin_islem
  ADD COLUMN IF NOT EXISTS butce_gelir_kalem_id bigint
    REFERENCES public.yerel_bilgi_butce_gelir (id) ON DELETE RESTRICT;

ALTER TABLE public.yerel_bilgi_butce_gider_islem
  ADD COLUMN IF NOT EXISTS butce_gelir_kalem_id bigint
    REFERENCES public.yerel_bilgi_butce_gelir (id) ON DELETE RESTRICT;

ALTER TABLE public.yerel_bilgi_butce_tahmin_islem
  ALTER COLUMN butce_gider_kalem_id DROP NOT NULL;

ALTER TABLE public.yerel_bilgi_butce_gider_islem
  ALTER COLUMN butce_gider_kalem_id DROP NOT NULL;

ALTER TABLE public.yerel_bilgi_butce_tahmin_islem
  DROP CONSTRAINT IF EXISTS yerel_bilgi_butce_tahmin_islem_kalem_chk;

ALTER TABLE public.yerel_bilgi_butce_tahmin_islem
  ADD CONSTRAINT yerel_bilgi_butce_tahmin_islem_kalem_chk CHECK (
    (butce_gider_kalem_id IS NOT NULL AND butce_gelir_kalem_id IS NULL)
    OR (butce_gider_kalem_id IS NULL AND butce_gelir_kalem_id IS NOT NULL)
  );

ALTER TABLE public.yerel_bilgi_butce_gider_islem
  DROP CONSTRAINT IF EXISTS yerel_bilgi_butce_gider_islem_kalem_chk;

ALTER TABLE public.yerel_bilgi_butce_gider_islem
  ADD CONSTRAINT yerel_bilgi_butce_gider_islem_kalem_chk CHECK (
    (butce_gider_kalem_id IS NOT NULL AND butce_gelir_kalem_id IS NULL)
    OR (butce_gider_kalem_id IS NULL AND butce_gelir_kalem_id IS NOT NULL)
  );

DROP INDEX IF EXISTS uq_ybti_mud_gider;
DROP INDEX IF EXISTS uq_ybti_mud_gelir;
CREATE UNIQUE INDEX uq_ybti_mud_gider ON public.yerel_bilgi_butce_tahmin_islem (mudurluk_id, butce_gider_kalem_id)
  WHERE butce_gider_kalem_id IS NOT NULL;
CREATE UNIQUE INDEX uq_ybti_mud_gelir ON public.yerel_bilgi_butce_tahmin_islem (mudurluk_id, butce_gelir_kalem_id)
  WHERE butce_gelir_kalem_id IS NOT NULL;

DROP INDEX IF EXISTS uq_ybgi_mud_gider;
DROP INDEX IF EXISTS uq_ybgi_mud_gelir;
CREATE UNIQUE INDEX uq_ybgi_mud_gider ON public.yerel_bilgi_butce_gider_islem (mudurluk_id, butce_gider_kalem_id)
  WHERE butce_gider_kalem_id IS NOT NULL;
CREATE UNIQUE INDEX uq_ybgi_mud_gelir ON public.yerel_bilgi_butce_gider_islem (mudurluk_id, butce_gelir_kalem_id)
  WHERE butce_gelir_kalem_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
