-- Kazanç Bilgileri › Taşınır Yetkilileri tanımları
-- Görev adı, personel Görevlendirme Bilgileri › Taşınır Görevi seçenekleriyle aynıdır.
-- Tutarı, kadro yan ödemesine eklenerek Terfi Bilgileri'nde gösterilir.

CREATE TABLE IF NOT EXISTS public.tanim_kazanc_tasinir_yetkili (
  id         SERIAL PRIMARY KEY,
  gorev_adi  TEXT        NOT NULL,
  tutar      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tanim_kazanc_tasinir_yetkili_gorev_adi_key UNIQUE (gorev_adi),
  CONSTRAINT tanim_kazanc_tasinir_yetkili_gorev_adi_check
    CHECK (
      gorev_adi IN (
        'Taşınır Kayıt Yetkilisi',
        'Taşınır Kontrol Yetkilisi'
      )
    )
);

ALTER TABLE public.tanim_kazanc_tasinir_yetkili ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.tanim_kazanc_tasinir_yetkili IS
  'Taşınır görevi kazanç tutarları (kadro yan ödemesine eklenir)';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tanim_kazanc_tasinir_yetkili'
      AND policyname = 'authenticated_full_access'
  ) THEN
    CREATE POLICY "authenticated_full_access" ON public.tanim_kazanc_tasinir_yetkili
      FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;
