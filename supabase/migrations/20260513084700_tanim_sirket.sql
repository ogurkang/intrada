-- Şirket tanımları tablosu
-- ADABEL personelinin "Görev Yeri" alanı için şirket listesi kaynağı

CREATE TABLE IF NOT EXISTS public.tanim_sirket (
  id         SERIAL PRIMARY KEY,
  sirket_adi TEXT    NOT NULL,
  aktif      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tanim_sirket ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.tanim_sirket;
CREATE POLICY "authenticated_full_access" ON public.tanim_sirket
  FOR ALL USING (auth.role() = 'authenticated');
