-- Sosyal Hak Kesintileri birleşik dönem tablosu
CREATE TABLE IF NOT EXISTS public.sosyal_hak_donem (
  id               serial      PRIMARY KEY,
  yil              integer     NOT NULL,
  sira_no          text,
  donem_adi        text,
  baslangic_tarihi date        NOT NULL,
  bitis_tarihi     date        NOT NULL,
  durum            text        NOT NULL DEFAULT 'Açık' CHECK (durum IN ('Açık', 'Kapalı')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sosyal_hak_donem ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON public.sosyal_hak_donem
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seçim tablosu: hangi izinler hangi döneme dahil, hangi tipten
CREATE TABLE IF NOT EXISTS public.sosyal_hak_secim (
  id           serial  PRIMARY KEY,
  donem_id     integer NOT NULL REFERENCES public.sosyal_hak_donem(id) ON DELETE CASCADE,
  izin_sira_no text    NOT NULL,
  tip          text    NOT NULL CHECK (tip IN ('rmy', 'ivy', 'izy')),
  dahil        boolean NOT NULL DEFAULT true,
  UNIQUE (donem_id, izin_sira_no)
);

ALTER TABLE public.sosyal_hak_secim ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON public.sosyal_hak_secim
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
