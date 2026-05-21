-- Şirket ↔ yerleşke çoklu ilişki (müdürlük yapısı ile aynı)

CREATE TABLE IF NOT EXISTS public.tanim_sirket_yerleske (
  id                 SERIAL PRIMARY KEY,
  sirket_id          INTEGER NOT NULL REFERENCES public.tanim_sirket (id) ON DELETE CASCADE,
  yerleske_adresi_id INTEGER NOT NULL REFERENCES public.tanim_yerleske_adresi (id) ON DELETE CASCADE,
  konum              TEXT NOT NULL DEFAULT 'İç',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sirket_id, yerleske_adresi_id)
);

COMMENT ON TABLE public.tanim_sirket_yerleske IS 'Şirket–yerleşke adresi çoklu eşlemesi';
COMMENT ON COLUMN public.tanim_sirket_yerleske.konum IS 'Bu şirketin ilgili yerleşkedeki konumu: İç veya Dış';

CREATE INDEX IF NOT EXISTS idx_tanim_sirket_yerleske_sirket
  ON public.tanim_sirket_yerleske (sirket_id);

CREATE INDEX IF NOT EXISTS idx_tanim_sirket_yerleske_yerleske
  ON public.tanim_sirket_yerleske (yerleske_adresi_id);

ALTER TABLE public.tanim_sirket_yerleske ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.tanim_sirket_yerleske;
CREATE POLICY "authenticated_full_access" ON public.tanim_sirket_yerleske
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.tanim_sirket DROP COLUMN IF EXISTS konum;
