-- İl / ilçe / mahalle adres tanımları (personel adres seçimi için)

CREATE TABLE IF NOT EXISTS public.tanim_adres_mahalle (
  id           SERIAL PRIMARY KEY,
  il           TEXT        NOT NULL,
  ilce         TEXT        NOT NULL,
  mahalle_adi  TEXT        NOT NULL,
  aktif        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tanim_adres_mahalle IS 'Personel adresi için mahalle tanımları (il + ilçe + mahalle adı)';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tanim_adres_mahalle_benzersiz
  ON public.tanim_adres_mahalle (
    lower(trim(il)),
    lower(trim(ilce)),
    lower(trim(mahalle_adi))
  );

CREATE INDEX IF NOT EXISTS idx_tanim_adres_mahalle_il_ilce
  ON public.tanim_adres_mahalle (il, ilce);

ALTER TABLE public.tanim_adres_mahalle ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.tanim_adres_mahalle;
CREATE POLICY "authenticated_full_access" ON public.tanim_adres_mahalle
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.calisan
  ADD COLUMN IF NOT EXISTS mahalle_id INTEGER
  REFERENCES public.tanim_adres_mahalle (id) ON DELETE SET NULL;

ALTER TABLE public.calisan
  ADD COLUMN IF NOT EXISTS adres_detay TEXT;

COMMENT ON COLUMN public.calisan.mahalle_id IS 'Tanımlardan seçilen mahalle (il/ilçe/mahalle)';
COMMENT ON COLUMN public.calisan.adres_detay IS 'Mahalle sonrası açık adres (sokak, bina no vb.)';

CREATE INDEX IF NOT EXISTS idx_calisan_mahalle_id ON public.calisan (mahalle_id);
