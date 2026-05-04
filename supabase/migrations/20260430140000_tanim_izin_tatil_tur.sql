-- Tatil turu tanimlari: /tanimlar/tatil-tur-tanimlari ve tatil formu secimleri.

CREATE TABLE IF NOT EXISTS public.tanim_izin_tatil_tur (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tur_adi text NOT NULL,
  sira_no integer,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tanim_izin_tatil_tur_tur_adi_unique UNIQUE (tur_adi)
);

CREATE INDEX IF NOT EXISTS idx_tanim_izin_tatil_tur_aktif_sira ON public.tanim_izin_tatil_tur (aktif, sira_no);

COMMENT ON TABLE public.tanim_izin_tatil_tur IS 'Tatil turu etiketleri; Tatil tanimlari formunda secim listesi.';

ALTER TABLE public.tanim_izin_tatil_tur ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.tanim_izin_tatil_tur;
CREATE POLICY "authenticated_full_access" ON public.tanim_izin_tatil_tur
  FOR ALL USING (auth.role() = 'authenticated');

INSERT INTO public.tanim_izin_tatil_tur (tur_adi, sira_no, aktif)
VALUES
  ('Ulusal Bayram', 10, true),
  ('Resmi Tatil', 20, true),
  ('Dini Bayram', 30, true),
  ('Hafta Sonu', 40, true),
  ('İdari Tatil', 50, true),
  ('Diğer', 60, true)
ON CONFLICT (tur_adi) DO NOTHING;
