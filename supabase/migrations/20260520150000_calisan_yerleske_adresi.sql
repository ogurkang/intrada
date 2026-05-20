-- Personel kartı: çalışılan yerleşke adresi (Görev Bilgileri)

ALTER TABLE public.calisan
  ADD COLUMN IF NOT EXISTS yerleske_adresi_id INTEGER
  REFERENCES public.tanim_yerleske_adresi (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.calisan.yerleske_adresi_id IS 'Personelin fiilen çalıştığı yerleşke adresi (Görev Bilgileri)';

CREATE INDEX IF NOT EXISTS idx_calisan_yerleske_adresi_id
  ON public.calisan (yerleske_adresi_id);
