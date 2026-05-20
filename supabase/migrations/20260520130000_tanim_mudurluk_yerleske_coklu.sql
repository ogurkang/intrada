-- Müdürlük ↔ yerleşke çoklu ilişki (tek FK yerine junction tablo)

CREATE TABLE IF NOT EXISTS public.tanim_mudurluk_yerleske (
  id                 SERIAL PRIMARY KEY,
  mudurluk_id        INTEGER NOT NULL REFERENCES public.tanim_mudurluk (id) ON DELETE CASCADE,
  yerleske_adresi_id INTEGER NOT NULL REFERENCES public.tanim_yerleske_adresi (id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mudurluk_id, yerleske_adresi_id)
);

COMMENT ON TABLE public.tanim_mudurluk_yerleske IS 'Müdürlük–yerleşke adresi çoklu eşlemesi';

INSERT INTO public.tanim_mudurluk_yerleske (mudurluk_id, yerleske_adresi_id)
SELECT id, yerleske_adresi_id
FROM public.tanim_mudurluk
WHERE yerleske_adresi_id IS NOT NULL
ON CONFLICT (mudurluk_id, yerleske_adresi_id) DO NOTHING;

ALTER TABLE public.tanim_mudurluk DROP COLUMN IF EXISTS yerleske_adresi_id;

DROP INDEX IF EXISTS idx_tanim_mudurluk_yerleske_adresi_id;

CREATE INDEX IF NOT EXISTS idx_tanim_mudurluk_yerleske_mudurluk
  ON public.tanim_mudurluk_yerleske (mudurluk_id);

CREATE INDEX IF NOT EXISTS idx_tanim_mudurluk_yerleske_yerleske
  ON public.tanim_mudurluk_yerleske (yerleske_adresi_id);

ALTER TABLE public.tanim_mudurluk_yerleske ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.tanim_mudurluk_yerleske;
CREATE POLICY "authenticated_full_access" ON public.tanim_mudurluk_yerleske
  FOR ALL USING (auth.role() = 'authenticated');
