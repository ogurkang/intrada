-- Ek gösterge tablosu: derece (1–15), kademe (1–9), gösterge değeri, aktif.

CREATE TABLE IF NOT EXISTS public.tanim_gosterge (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  derece smallint NOT NULL CHECK (derece >= 1 AND derece <= 15),
  kademe smallint NOT NULL CHECK (kademe >= 1 AND kademe <= 9),
  gosterge numeric NOT NULL,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tanim_gosterge_dk ON public.tanim_gosterge (derece, kademe);
CREATE INDEX IF NOT EXISTS idx_tanim_gosterge_aktif ON public.tanim_gosterge (aktif);

COMMENT ON TABLE public.tanim_gosterge IS 'Derece/kademe bazlı ek gösterge tutarları; tanımlar modülünden yönetilir.';

ALTER TABLE public.tanim_gosterge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.tanim_gosterge;
CREATE POLICY "authenticated_full_access" ON public.tanim_gosterge
  FOR ALL USING (auth.role() = 'authenticated');
