-- Müdürlük tanımına konum (İç / Dış); uygulama doğrulaması
ALTER TABLE public.tanim_mudurluk
  ADD COLUMN IF NOT EXISTS konum text NOT NULL DEFAULT 'İç';

COMMENT ON COLUMN public.tanim_mudurluk.konum IS 'Müdürlük konumu: İç veya Dış';
