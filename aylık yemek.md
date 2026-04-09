# Aylık Yemek (AYY) Kuralları

Bu doküman, AYY hesap motorunda uygulanan güncel kuralları tek yerde toplar.

## 1) Dönem ve kapanış kuralı

- Her AYY döneminde `baslangic_tarihi` ve `bitis_tarihi` vardır.
- Dönem `Kapalı` yapılınca `kapatildi_at` otomatik yazılır.
- Dönem tekrar `Açık` yapılınca `kapatildi_at` `NULL` olur.
- Geçmiş dönemlerde kural yeni geldiyse `kapatildi_at` elle doldurulabilir.
- Kapanış sonrası kayıtlar için eşik: `kayit_tarihi > kapatildi_at`.
- `kapatildi_at` boşsa eski davranış: `kayit_tarihi > onceki_donem.bitis_tarihi`.

## 2) Havuz mantığı (A ∪ B ∪ C)

- A: Önceki dönem eşiğinden sonra kaydedilen izinler.
- B: Önceki dönemden `SD > 0` devreden izinler.
- C: Önceki dönemde hariç tutulan ve yeni dönemde tekrar görünen izinler.
- Kesintiye giren nihai liste: havuzdan, sadece bu dönem için hariç tutulanlar çıkarıldıktan sonra kalanlar.
- İptal izinler ve memur/sözleşmeli filtresi dışındakiler havuza alınmaz.

## 3) Gecikmiş kayıt (arada kalan) kuralı

- Önceki dönem kapandıktan sonra kaydedilmiş olacak.
- İzin aktif dönemin başlangıcından önce başlayıp yine başlangıçtan önce bitecek.
- Bu durumda izin süresi bu dönemde kesintiye yazılır (tam süre mantığı).

## 4) Zabıta ve normal kesinti kuralı

- Varsayılan zabıta personel listesi kadro/unvan/müdürlük bilgisinden bulunur.
- `ayy_zabita_normal_kesinti_sicil` tablosundaki siciller normal kesintiye döner.
- Zabıta kuralında 30 gün tabanı ve 24 alt sınır korunur.
- Toplam izin etkisi için zabıtada baz izin `max(IZ, hamIzin)` alınır.

## 5) Mehil izni özel kuralı

- Mehil izinleri takvim mantığıyla değerlendirilir.
- Mehil için yemek alacağı klasik `YG - IZ` değil, dönemde mehil sonrası kalan gün ile belirlenir:
  - `baslama` (işe dönüş) dönem bitişinden sonraysa `K = 0`.
  - Değilse:
    - zabıta değil: `baslama..donem_bitis` çalışma günü,
    - zabıta: `baslama..donem_bitis` takvim günü.
- Mehilde `IZ = yemekliGun - K` olarak türetilir.
- Mehil dönem dışına taşıyorsa `SD` sonraki döneme devreder.

## 6) Dönem açılışında kontrol listesi

Her AYY dönemi açılışında şu kontroller yapılır:

1. Aynı anda başka bir AYY dönemi açık olmamalı.
2. Önceki dönemin `kapatildi_at` alanı boş olmamalı.
3. Kayıt tarihleri tek bir saat dilimi kuralında tutulmalı (UTC veya TR net seçilmeli).

## 7) Operasyon notu

- Saat dilimi karışıklığı kaymaya neden olur; tek standart kullanılmalıdır.
- Sınır senaryoları için kontrol alanı:
  - `kapatildi_at`
  - `izin_hareketleri.kayit_tarihi`
  - izin `ayrilis/baslama` aralığı
  - personelin zabıta/normal statüsü
