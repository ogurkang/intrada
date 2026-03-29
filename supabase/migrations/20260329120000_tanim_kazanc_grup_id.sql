-- Çoklu öğrenim aynı puan satırında: aynı gruptaki satırlar tek listede gösterilir
ALTER TABLE public.tanim_kazanc_bilgisi
  ADD COLUMN IF NOT EXISTS kazanc_grup_id uuid;

CREATE INDEX IF NOT EXISTS idx_tanim_kazanc_grup ON public.tanim_kazanc_bilgisi (kazanc_grup_id);

COMMENT ON COLUMN public.tanim_kazanc_bilgisi.kazanc_grup_id IS 'Aynı kazanç satırında birleşen öğrenimler; NULL = tek satır (eski kayıtlar).';
