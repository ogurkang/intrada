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

-- 436 sicil numaralı personel, id=5 dönemi: 2 günlük SD sıfırla.
-- Ayrılış tarihi 06.01.2026 olarak düzeltildi; ancak dönem id=1 kapandıktan sonra
-- kayıt yapıldığı için fark kapalı döneme giremedi ve hesapta 2 günlük sapma oluştu.
INSERT INTO public.ayy_sd_override (donem_id, sicil_no, sd_override, aciklama)
VALUES (
  5,
  '436',
  0,
  '06.01.2026 ayrilis duzeltmesi: donem id=1 kapali oldugu icin 2 gunluk fark bir onceki doneme giremedi. id=5 sonrasi SD sifirlanarak zincir kapatildi.'
)
ON CONFLICT (donem_id, sicil_no) DO UPDATE
  SET sd_override = EXCLUDED.sd_override,
      aciklama    = EXCLUDED.aciklama;
