-- Kurum Görevlendirme seçeneğini gorev_turu check constraint'e ekle
ALTER TABLE public.calisan
  DROP CONSTRAINT IF EXISTS calisan_gorev_turu_check;

ALTER TABLE public.calisan
  ADD CONSTRAINT calisan_gorev_turu_check
  CHECK (gorev_turu IN (
    'Çalışan',
    'Aylıksız İzin',
    'Geçici Görevlendirme',
    'Kurum Görevlendirme',
    'Yarı Zamanlı'
  ));
