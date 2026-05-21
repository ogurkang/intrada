-- ADABEL personeli yerleşke ataması (Görev müdürlüğüne bağlı yerleşke tanımları ile)

ALTER TABLE public.firma_calisanlar
  ADD COLUMN IF NOT EXISTS yerleske_adresi_id INTEGER
  REFERENCES public.tanim_yerleske_adresi (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.firma_calisanlar.yerleske_adresi_id IS 'ADABEL personelinin fiilen çalıştığı yerleşke adresi';

CREATE INDEX IF NOT EXISTS idx_firma_calisanlar_yerleske_adresi_id
  ON public.firma_calisanlar (yerleske_adresi_id);
