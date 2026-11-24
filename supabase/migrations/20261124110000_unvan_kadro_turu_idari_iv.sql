-- (IV) Sayılı Liste: İdari Personel Kadro Unvanları → kadro_turu = 'idari'
-- Kaynak: Belediye Norm Kadro Yönetmeliği Ek-3 (IV) Sayılı Liste.
-- Not: Şef, Zabıta Memuru vb. cetvelde ayrı satırdır; IV listesinde değildir.
-- V.H.K.İ. = Veri Hazırlama ve Kontrol İşletmeni (sistemdeki kısa ad).

update public.tanim_unvan
set kadro_turu = 'idari'
where unvan_adi in (
  'Anbar Memuru',
  'Antrenör',
  'Ayniyat Saymanı',
  'Ayniyat Memuru',
  'Balık Adam',
  'Bando Şefi',
  'Bandocu',
  'Belediye Trafik Memuru',
  'Bilet Satış Memuru',
  'Bilgisayar İşletmeni',
  'Çocuk Eğiticisi',
  'Çocuk Eğitimcisi',
  'Çocuk Rehberi ve Gözetimcisi',
  'Dalgıç',
  'Eğitmen',
  'Evlendirme Memuru',
  'Fotoğrafçı',
  'Gemi Adamı',
  'Gişe Memuru',
  'İmam',
  'Kameraman',
  'Memur',
  'Muhasebeci',
  'Mutemet',
  'Mütercim',
  'Sayaç Memuru',
  'Sivil Savunma Uzmanı',
  'Şoför',
  'Tahsildar',
  'Tercüman',
  'Veznedar',
  'V.H.K.İ.',
  'Veri Hazırlama ve Kontrol İşletmeni'
);
