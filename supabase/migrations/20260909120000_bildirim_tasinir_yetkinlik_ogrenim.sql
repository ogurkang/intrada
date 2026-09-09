-- Öğrenim: Kadrosu İle İlgili
ALTER TABLE public.calisan_ogrenim
  ADD COLUMN IF NOT EXISTS kadrosu_ile_ilgili boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.calisan_ogrenim.kadrosu_ile_ilgili IS
  'Öğrenimin kadro ünvanı / kazanç tanımı ile ilgili olup olmadığı';

-- Yetkinlik: Bilgisayar kullanıyor (varsayılan evet)
ALTER TABLE public.calisan
  ADD COLUMN IF NOT EXISTS bilgisayar_kullaniyor boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.calisan.bilgisayar_kullaniyor IS
  'Yetkinlik bildirimi: Bilgisayar Kullanıyor / Kullanmıyor';

-- Taşınır görev puanının terfi yan ödemesine yazılıp yazılmadığı
ALTER TABLE public.calisan
  ADD COLUMN IF NOT EXISTS tasinir_yan_odeme_uygulandi boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.calisan.tasinir_yan_odeme_uygulandi IS
  'Aktif taşınır görev puanı terfi yan ödemesine eklendiyse true';

CREATE TABLE IF NOT EXISTS public.tasinir_gorev_bildirimleri (
  id                     SERIAL PRIMARY KEY,
  sicil_no               TEXT        NOT NULL REFERENCES public.calisan(sicil_no) ON DELETE CASCADE,
  gorev_adi              TEXT        NOT NULL,
  gorev_mudurlugu        TEXT,
  aktif                  BOOLEAN     NOT NULL DEFAULT true,
  yan_odeme_uygulandi    BOOLEAN     NOT NULL DEFAULT false,
  baslangic_tarihi       DATE        NOT NULL DEFAULT CURRENT_DATE,
  bitis_tarihi           DATE,
  kayit_zamani           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tasinir_gorev_bildirimleri_gorev_adi_check
    CHECK (
      gorev_adi IN (
        'Taşınır Kayıt Yetkilisi',
        'Taşınır Kontrol Yetkilisi'
      )
    )
);

CREATE INDEX IF NOT EXISTS tasinir_gorev_bildirimleri_sicil_idx
  ON public.tasinir_gorev_bildirimleri (sicil_no);

CREATE INDEX IF NOT EXISTS tasinir_gorev_bildirimleri_aktif_idx
  ON public.tasinir_gorev_bildirimleri (aktif, gorev_adi);

ALTER TABLE public.tasinir_gorev_bildirimleri ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.tasinir_gorev_bildirimleri IS
  'Taşınır görev bildirimi geçmişi; pasif kayıtlar listede kalır';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tasinir_gorev_bildirimleri'
      AND policyname = 'authenticated_full_access'
  ) THEN
    CREATE POLICY "authenticated_full_access" ON public.tasinir_gorev_bildirimleri
      FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

INSERT INTO public.tasinir_gorev_bildirimleri (
  sicil_no, gorev_adi, aktif, yan_odeme_uygulandi, baslangic_tarihi
)
SELECT
  c.sicil_no,
  c.tasinir_gorevi,
  true,
  false,
  CURRENT_DATE
FROM public.calisan c
WHERE c.tasinir_gorevi IN (
  'Taşınır Kayıt Yetkilisi',
  'Taşınır Kontrol Yetkilisi'
)
  AND NOT EXISTS (
    SELECT 1
    FROM public.tasinir_gorev_bildirimleri t
    WHERE t.sicil_no = c.sicil_no
      AND t.gorev_adi = c.tasinir_gorevi
      AND t.aktif = true
  );
