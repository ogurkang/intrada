-- Tek seferlik: id=3 dönem kapanış zamanı (Türkiye 09.03.2026 15:00)
UPDATE public.aylik_yemek_yeni_donem
SET kapatildi_at = '2026-03-09T15:00:00+03:00'::timestamptz
WHERE id = 3;
