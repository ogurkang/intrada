# Aylık Yemek (AYY) Kuralları

Bu doküman, AYY hesap motorunun güncel ve kesinleşmiş kurallarını tek yerde toplar.
Buradaki kurallar kasıtlı olarak değiştirilmeden önce **geliştirici onayı** gerektirir.

---

## 1) Dönem ve kapanış kuralı

- Her AYY döneminde `baslangic_tarihi` ve `bitis_tarihi` vardır.
- Dönem `Kapalı` yapılınca `aylik_yemek_yeni_donem.kapatildi_at` otomatik atanır (sunucu saati, UTC ISO).
- Dönem tekrar `Açık` yapılınca `kapatildi_at` `NULL` olur.
- Geçmiş dönemler için kural yeni geldiyse `kapatildi_at` elle doldurulabilir.
- **Bir dönem kapandığında o dönem ölü kabul edilir.** Kapanış sonrası kaydedilen hiçbir izin o döneme giremez.

---

## 2) Havuz mantığı (A ∪ B ∪ C)

| Havuz | Tanım |
|-------|-------|
| **A** | Önceki dönem eşiğinden (`kapatildi_at` ya da `bitis_tarihi`) **sonra** kaydedilen izinler |
| **B** | Önceki dönemden `SD > 0` ile **devreden** izinler |
| **C** | Önceki dönemde hariç tutulan ve yeni dönemde tekrar görünen izinler |

### Havuz A için kritik filtre — `queryIzinA`

```
Alt sınır  : kayit_tarihi > onceki_donem.kapatildi_at  (boşsa: bitis_tarihi)
Üst sınır  : kayit_tarihi ≤ bu_donem.kapatildi_at      (boşsa: bitis_tarihi)
```

**Bu filtre AYY'nin kalbidir.** Kapalı dönemlerde üst sınır olarak `bitis_tarihi` yerine
`kapatildi_at` kullanılmasının nedeni: kullanıcılar izinlerini geç bildirmektedir. Geç bildirilen
izin kapanmış döneme girerse `SD → OD` zinciri oluşur ve sonraki dönem `IZ` şişer. Bu hatayı
engelleyen tek güvence bu filtredir.

> **Değiştirme yasağı:** Bu üst sınır mantığı geliştiriciden açık onay alınmadan değiştirilemez.

---

## 3) Gecikmiş kayıt (arada kalan) kuralı

Aşağıdaki koşulların **tamamı** sağlanıyorsa izin "arada kalan" olarak işlenir:

1. `OD = 0` (önceki dönemden devren yok),
2. İzin, önceki dönem kapatıldıktan **sonra** kaydedilmiş (`kayit_tarihi > onceki.kapatildi_at`),
3. İzin, aktif dönemin **başlangıcından önce** başlamış (`ayrilis < donem.baslangic_tarihi`),
4. İzin, aktif dönemin **başlangıcından önce** bitmiş (`baslama < donem.baslangic_tarihi`).

Bu durumda izin aktif döneme alınır; tam süresi bu dönemde kesilir, `SD = 0`.

---

## 4) Zabıta ve normal kesinti kuralı

| Kural | Zabıta | Normal |
|-------|--------|--------|
| Gün sayım türü | Takvim günü | Çalışma günü (hafta sonu + tatil hariç) |
| `K` (Yemek Alacağı Gün) | `zabitaYemekAlacagi(IZ)` | `max(0, YG − IZ)` |

### `zabitaYemekAlacagi(iz)` fonksiyonu
```
net = 30 − iz
if net ≥ 24 → K = 24
if 0 < net < 24 → K = net
if net ≤ 0 → K = 0
```

### Özet satırında K
- Mehil izni varsa: satır bazında hesaplanan K değerleri **toplanır**.
- Zabıta ise: `zabitaYemekAlacagi(toplam IZ)` — `hamIzin` (iv.gun) **baz alınmaz**, çünkü `iv.gun` sonraki döneme taşan günleri içerebilir.
- Normal: `max(0, YG − IZ)`.

### Zabıta havuzu
- `ayy_zabita_normal_kesinti_sicil` tablosundaki siciller **normal** kesintiye döner (zabıta kuralından çıkar).

---

## 5) Mehil izni özel kuralı

- Mehil izinleri `tur` alanında "mehil" geçiyorsa tespit edilir (büyük/küçük harf bağımsız).
- Gün sayımı: **takvim günü** (zabıta/normal ayrımına bakılmaksızın).
- `K` hesabı klasik `YG − IZ` değil; mehil **dönüşünden** (işe giriş `baslama`) dönem sonuna kalan gün ile belirlenir:
  - `baslama > donem.bitis_tarihi` → `K = 0`
  - Değilse: zabıta → takvim günü; normal → çalışma günü (`baslama..donem_bitis`)
- `IZ = YG − K` (türetilir, doğrudan hesaplanmaz).
- Mehil dönem dışına taşıyorsa fazla gün `SD` olarak sonraki döneme devrer.

---

## 6) Dönem açılışında kontrol listesi — `ayyDonemAcilisKontrolu`

Her AYY dönemi açılışında şu kontroller çalışır:

1. Aynı anda başka bir AYY dönemi açık **olmamalı**.
2. Önceki dönemin `kapatildi_at` alanı **boş olmamalı**.
3. Kayıt tarihleri tek bir saat dilimi standardında tutulmalı (UTC tercih edilir).

Bu kontroller `kesinti-actions.ts → donemAc` içinden `ayyDonemAcilisKontrolu` çağrısıyla tetiklenir.

---

## 7) Statü Bazlı AYY (SBAY) — özet

Bazı personel `izin_hareketleri` yerine `calisan.gorev_turu` kaynağıyla AYY hesabına girer.
Ayrıntılı kurallar için → **`statu-bazli-ayy.md`**

| Statü | Kural özeti |
|-------|-------------|
| `Aylıksız İzin` | Dönemle örtüşen çalışma günü = IZ; K = YG − IZ |
| `Yarı Zamanlı` | base_IZ = ⌈YG/2⌉; extra_IZ izin hareketlerinden; K = YG − total_IZ |
| `Geçici Görevlendirme` (yemek hakkı hayır) | GG süresi K'ya katkı sağlamaz; K = max(0, YG − GG_gun − IZ) |

---

## 8) Kritik kod dosyaları

| Dosya | Rol | Değiştirme riski |
|-------|-----|-----------------|
| `src/lib/ayy-hesap.ts` | Ana hesap motoru (IZ, K, SD, OD, mehil, arada kalan, SBAY) | 🔴 Çok yüksek |
| `src/lib/ayy-donem-havuz.ts` | Havuz A/B/C yükleme + `kayit_tarihi` filtreleri + SBAY yükleme | 🔴 Çok yüksek |
| `src/lib/ayy-kayit-esik.ts` | Kayıt/kapanış eşik karşılaştırması | 🔴 Çok yüksek |
| `src/lib/kesinti-actions.ts` | Dönem aç/kapat, donemAcilisKontrolu | 🟠 Yüksek |

---

## 9) Operasyon notu

- Saat dilimi karışıklığı kaymaya neden olur; UTC tutulmalıdır.
- Tüm `kapatildi_at` değerleri UTC ISO (ör. `2026-03-09T15:00:00+00:00`) formatında saklanır.
- Eski dönemlerin `kapatildi_at` değerleri yoksa elle doldurulabilir; sonrasında sistem otomatik yönetir.
