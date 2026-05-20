-- Yerleşke adresi tanımları ve müdürlük ilişkisi

CREATE TABLE IF NOT EXISTS public.tanim_yerleske_adresi (
  id           SERIAL PRIMARY KEY,
  sira_no      INTEGER,
  yerleske_adi TEXT        NOT NULL,
  adres        TEXT        NOT NULL,
  aktif        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tanim_yerleske_adresi IS 'Yerleşke adresi tanımları (rapor ve müdürlük eşlemesi)';

ALTER TABLE public.tanim_yerleske_adresi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.tanim_yerleske_adresi;
CREATE POLICY "authenticated_full_access" ON public.tanim_yerleske_adresi
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.tanim_mudurluk
  ADD COLUMN IF NOT EXISTS yerleske_adresi_id INTEGER
  REFERENCES public.tanim_yerleske_adresi (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.tanim_mudurluk.yerleske_adresi_id IS 'Müdürlüğün bağlı olduğu yerleşke adresi';

CREATE INDEX IF NOT EXISTS idx_tanim_mudurluk_yerleske_adresi_id
  ON public.tanim_mudurluk (yerleske_adresi_id);
