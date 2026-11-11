-- AYY kapalı dönem devir özeti: SD / IZ (izin) + sicil bazlı yarı zamanlı / zabıta taşması.
-- Kapatılırken yazılır; sonraki dönem OD için yeniden hesap yerine bu özet okunur.

CREATE TABLE IF NOT EXISTS public.ayy_devir_ozet_meta (
  donem_id    INTEGER PRIMARY KEY REFERENCES public.aylik_yemek_yeni_donem(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ayy_devir_ozet_meta IS
  'AYY: dönem kapatılınca üretilen devir özetinin varlık kaydı. Varsa sonraki dönem bu dönemi yeniden hesaplamaz.';

CREATE TABLE IF NOT EXISTS public.ayy_devir_izin (
  donem_id  INTEGER NOT NULL REFERENCES public.aylik_yemek_yeni_donem(id) ON DELETE CASCADE,
  sira_no   TEXT    NOT NULL,
  sicil_no  TEXT,
  sd        INTEGER NOT NULL DEFAULT 0,
  iz        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (donem_id, sira_no)
);

COMMENT ON TABLE public.ayy_devir_izin IS
  'AYY kapalı dönem: sira_no bazlı SD (sonraki OD) ve o dönemdeki IZ (zabıta YG aşımı tespiti).';

CREATE TABLE IF NOT EXISTS public.ayy_devir_sicil (
  donem_id  INTEGER NOT NULL REFERENCES public.aylik_yemek_yeni_donem(id) ON DELETE CASCADE,
  sicil_no  TEXT    NOT NULL,
  tur       TEXT    NOT NULL CHECK (tur IN ('yari_zamanli', 'zabita_overflow')),
  gun       INTEGER NOT NULL,
  ad_soyad  TEXT,
  unvan     TEXT,
  PRIMARY KEY (donem_id, sicil_no, tur)
);

COMMENT ON TABLE public.ayy_devir_sicil IS
  'AYY kapalı dönem: sicil bazlı yarı zamanlı YG_eff aşımı veya zabıta IZ taşması (sonraki OD).';

CREATE INDEX IF NOT EXISTS ayy_devir_izin_donem_idx ON public.ayy_devir_izin (donem_id);
CREATE INDEX IF NOT EXISTS ayy_devir_sicil_donem_idx ON public.ayy_devir_sicil (donem_id);

ALTER TABLE public.ayy_devir_ozet_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ayy_devir_izin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ayy_devir_sicil ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ayy_devir_ozet_meta_authenticated ON public.ayy_devir_ozet_meta;
CREATE POLICY ayy_devir_ozet_meta_authenticated ON public.ayy_devir_ozet_meta
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ayy_devir_izin_authenticated ON public.ayy_devir_izin;
CREATE POLICY ayy_devir_izin_authenticated ON public.ayy_devir_izin
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ayy_devir_sicil_authenticated ON public.ayy_devir_sicil;
CREATE POLICY ayy_devir_sicil_authenticated ON public.ayy_devir_sicil
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
