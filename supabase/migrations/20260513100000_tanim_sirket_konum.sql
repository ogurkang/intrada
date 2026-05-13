-- tanim_sirket tablosuna konum kolonu ekle (tanim_mudurluk ile aynı yapı)
ALTER TABLE public.tanim_sirket
  ADD COLUMN IF NOT EXISTS konum text NOT NULL DEFAULT 'Dış';

COMMENT ON COLUMN public.tanim_sirket.konum IS 'Şirket konumu: İç veya Dış';
