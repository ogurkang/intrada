-- Öğrenim bildiriminde mezuniyet tarihi (gg.aa.yyyy kaydedilir; uygulama ISO yyyy-mm-dd yazar)
ALTER TABLE calisan_ogrenim ADD COLUMN IF NOT EXISTS mezuniyet_tarihi text;
