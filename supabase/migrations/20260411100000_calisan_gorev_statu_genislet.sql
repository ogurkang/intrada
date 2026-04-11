-- Görev türü bitiş tarihi, yemek hakkı ve engelli detay alanları
-- Gerekli: Statü Bazlı AYY hesabı (aylıksız izin / yarı zamanlı / geçici görevlendirme)

ALTER TABLE public.calisan
  ADD COLUMN IF NOT EXISTS gorev_turu_bitis_tarihi date,
  ADD COLUMN IF NOT EXISTS gorev_turu_yemek_hakki  boolean,
  ADD COLUMN IF NOT EXISTS engelli_oran             smallint,
  ADD COLUMN IF NOT EXISTS engelli_baslangic        date,
  ADD COLUMN IF NOT EXISTS engelli_bitis            date;

-- Engelli oranı 0–100 arası olmalı
ALTER TABLE public.calisan
  DROP CONSTRAINT IF EXISTS calisan_engelli_oran_check;
ALTER TABLE public.calisan
  ADD CONSTRAINT calisan_engelli_oran_check
    CHECK (engelli_oran IS NULL OR (engelli_oran >= 0 AND engelli_oran <= 100));

COMMENT ON COLUMN public.calisan.gorev_turu_bitis_tarihi IS
  'Aylıksız İzin / Geçici Görevlendirme / Yarı Zamanlı bitiş tarihi. Çalışan iken NULL.';
COMMENT ON COLUMN public.calisan.gorev_turu_yemek_hakki IS
  'Geçici Görevlendirmede yemek hakkı: true = evet, false = hayır, NULL = belirtilmemiş (Çalışan/diğer durumlar).';
COMMENT ON COLUMN public.calisan.engelli_oran IS
  'Engellilik oranı 0–100 (%).';
COMMENT ON COLUMN public.calisan.engelli_baslangic IS
  'Engellilik durumu başlangıç tarihi.';
COMMENT ON COLUMN public.calisan.engelli_bitis IS
  'Engellilik durumu bitiş tarihi (hatırlatıcı için).';
