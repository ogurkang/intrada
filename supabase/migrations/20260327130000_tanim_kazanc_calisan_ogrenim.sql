-- Kazanç bilgisi tanımları (unvan + öğrenim + derece/kademe + terfi alanları)
-- Öğrenim: calisan_ogrenim için meslegi, varsayilan

CREATE TABLE IF NOT EXISTS public.tanim_kazanc_bilgisi (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sira_no integer,
  unvan_id bigint NOT NULL REFERENCES public.tanim_unvan (id) ON DELETE RESTRICT,
  ogrenim_id bigint NOT NULL REFERENCES public.tanim_ogrenim (id) ON DELETE RESTRICT,
  derece smallint NOT NULL CHECK (derece >= 1 AND derece <= 15),
  kademe smallint NOT NULL CHECK (kademe >= 1 AND kademe <= 9),
  ek_gosterge text,
  ek_odeme text,
  oht text,
  yan_odeme text,
  sds_orani text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tanim_kazanc_unvan ON public.tanim_kazanc_bilgisi (unvan_id);
CREATE INDEX IF NOT EXISTS idx_tanim_kazanc_ogrenim ON public.tanim_kazanc_bilgisi (ogrenim_id);

COMMENT ON TABLE public.tanim_kazanc_bilgisi IS 'Unvan ve öğrenim kombinasyonuna göre kazanç parametreleri; Tanımlar > Kazanç Bilgileri.';

ALTER TABLE public.tanim_kazanc_bilgisi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.tanim_kazanc_bilgisi;
CREATE POLICY "authenticated_full_access" ON public.tanim_kazanc_bilgisi
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.calisan_ogrenim
  ADD COLUMN IF NOT EXISTS meslegi text;

ALTER TABLE public.calisan_ogrenim
  ADD COLUMN IF NOT EXISTS varsayilan boolean NOT NULL DEFAULT false;

UPDATE public.calisan_ogrenim SET varsayilan = COALESCE(aktif, false);
