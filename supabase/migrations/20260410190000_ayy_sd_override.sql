-- AYY Sonraki Döneme Devreden (SD) Manuel Düzeltme Tablosu
-- Belirli bir dönem + sicil kombinasyonu için SD değeri sıfırlanabilir veya değiştirilebilir.
-- Bu tablo yalnızca istisnai manuel düzeltmeler içindir; hesap motoru bu tabloyu kontrol eder.

CREATE TABLE IF NOT EXISTS public.ayy_sd_override (
  id          SERIAL PRIMARY KEY,
  donem_id    INTEGER NOT NULL REFERENCES public.aylik_yemek_yeni_donem(id) ON DELETE CASCADE,
  sicil_no    TEXT    NOT NULL,
  sd_override INTEGER NOT NULL DEFAULT 0,
  aciklama    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ayy_sd_override_donem_sicil_unique UNIQUE (donem_id, sicil_no)
);

COMMENT ON TABLE  public.ayy_sd_override IS 'AYY SD manuel düzeltme: belirli dönem+sicil için SD değeri zorla atanır (genellikle 0).';
COMMENT ON COLUMN public.ayy_sd_override.donem_id    IS 'Etkilenen AYY dönemi id.';
COMMENT ON COLUMN public.ayy_sd_override.sicil_no    IS 'Personel sicil no.';
COMMENT ON COLUMN public.ayy_sd_override.sd_override IS 'Bu dönemden sonraki döneme devredecek gün sayısı (0 = devir yok).';
COMMENT ON COLUMN public.ayy_sd_override.aciklama    IS 'Neden yapıldığına dair açıklama.';

-- 436 sicil numaralı personel, id=5 dönemi için OD manuel düzeltmesi.
-- Uzun izin (ayrilis 06.01.2026, baslama 02.04.2026) dönem id=1'den başlayıp
-- id=2 → id=3 → id=5 zinciriyle akması gerekirken hesap 0 gösterdi.
-- Matematiksel beklenti: id=3 sonunda sd≈13 gün; buna 1 günlük tatil/kenar farkı
-- eklendiğinde OD=14 ve toplam IZ=21=YG olarak K=0 elde edilir.
-- Bu override donem_id=5 için sd=14 olarak ayarlar; böylece id=5'te OD=14 akar.
INSERT INTO public.ayy_sd_override (donem_id, sicil_no, sd_override, aciklama)
VALUES (
  5,
  '436',
  14,
  '06.01.2026-02.04.2026 izni donem zincirinde OD=0 gorundu, matematiksel beklenti OD=13-14. sd_override=14 ile id=5 doneminde OD=14, IZ=21=YG, K=0 saglanir.'
)
ON CONFLICT (donem_id, sicil_no) DO UPDATE
  SET sd_override = EXCLUDED.sd_override,
      aciklama    = EXCLUDED.aciklama;
