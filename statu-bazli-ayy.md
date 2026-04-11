# Statü Bazlı AYY Kuralları (SBAY)

Bazı personelin aylık yemek (AYY) hesabı `izin_hareketleri` kaydına değil,
`calisan.gorev_turu` ya da `calisan.gorev_durumu` alanına göre belirlenir.
Bu belgede bu personelin hesap kuralları tanımlanmıştır.

> **Bağımlılık:** Kurallar `ayy-hesap.ts → ayyHesapla` fonksiyonunun
> `statuBazliPersonel` parametresi üzerinden beslenir.
> Veri `ayy-donem-havuz.ts → ayyLoadStatuBazliPersonel` ile çekilir.

---

## 1) Aylıksız İzin Otomatik Kesintisi

### Koşul
`calisan.gorev_turu = 'Aylıksız İzin'`

### Veri alanları
| Alan | Kullanım |
|------|----------|
| `gorev_turu_tarihi` | İznin başlangıç tarihi |
| `gorev_turu_bitis_tarihi` | İznin bitiş tarihi |

### Hesap kuralı
1. Dönem ile aylıksız izin aralığının **örtüşen çalışma günü sayısı** hesaplanır:
   - `kesinti_bas = max(gorev_turu_tarihi, donem_baslangic)`
   - `kesinti_bit = min(gorev_turu_bitis_tarihi, donem_bitis)`
   - `IZ = calismaGunSayisi(kesinti_bas, kesinti_bit)` (zabıta ise takvim günü)
2. `K = max(0, YG − IZ)`
3. `SD = 0` (aylıksız izin sonraki döneme devretmez; bitiş tarihi dönem içindeyse normal K devam eder)

### Notlar
- Aylıksız izin `izin_hareketleri`'nde **yer almaz**; kaynak yalnızca `calisan.gorev_turu`.
- `gorev_turu_bitis_tarihi` girilmemişse kişi tüm dönem boyunca aylıksız sayılır → `IZ = YG, K = 0`.
- İzin dönemi dışında kalan gün için herhangi bir kesinti yapılmaz.

---

## 2) Yarı Zamanlı Yemek Kuralı (YZY)

### Koşul
`calisan.gorev_turu = 'Yarı Zamanlı'`

### Hesap kuralı
| Adım | Formül |
|------|--------|
| Taban kesinti | `base_IZ = ⌈YG / 2⌉` (küsürat her zaman yukarı yuvarlanır) |
| İzin hareketi | `extra_IZ = izin_hareketleri`'nden normal AYY kuralıyla hesaplanan gün |
| Toplam kesinti | `total_IZ = base_IZ + extra_IZ` |
| Yemek alacağı | `K = max(0, YG − total_IZ)` |

### Örnekler
| YG | Ek izin | base_IZ | total_IZ | K |
|----|---------|---------|----------|---|
| 22 | 0 | 11 | 11 | 11 |
| 21 | 0 | 11 | 11 | 10 |
| 21 | 3 | 11 | 14 | 7 |
| 20 | 5 | 10 | 15 | 5 |

### Notlar
- `gorev_turu_bitis_tarihi` dönem içindeyse: bitiş tarihine kadar YZY kuralı, sonrasında normal kural.
- İzin hareketleri (rapor, yıllık vb.) ayrıca işlenmeye devam eder.
- `base_IZ` sira_no'su: `SYN_YZM_{sicil_no}` (sentetik, havuz filtrelerine tabi değil).

---

## 3) Geçici Görevlendirme Yemek Kuralı (GGYK)

### Koşul
`calisan.gorev_turu = 'Geçici Görevlendirme'` **VE** `gorev_turu_yemek_hakki = false`

### Veri alanları
| Alan | Kullanım |
|------|----------|
| `gorev_turu_tarihi` | Görevin başlangıç tarihi |
| `gorev_turu_bitis_tarihi` | Görevin bitiş tarihi |
| `gorev_turu_yemek_hakki` | `false` = yemek hakkı yok |

### Hesap kuralı
1. Dönem içindeki **geçici görev süresi** (GG) hesaplanır:
   - `gg_bas = max(gorev_turu_tarihi, donem_baslangic)`
   - `gg_bit = min(gorev_turu_bitis_tarihi, donem_bitis)` (bitis yoksa donem_bitis)
   - `gg_gun = calismaGunSayisi(gg_bas, gg_bit)` — GG süresince K = 0
2. **Kalan süre** (KS) = YG − gg_gun
3. İzin hareketi kesintileri (IZ) dönemin tamamından hesaplanır.
4. `K = max(0, KS − IZ)`

### Örnekler
| YG | GG süresi | IZ | KS | K |
|----|-----------|----|----|---|
| 21 | 5 (dönem içi, bitti) | 0 | 16 | 16 |
| 21 | 5 (dönem içi, bitti) | 3 | 16 | 13 |
| 21 | 21 (tüm dönem) | 0 | 0 | 0 |
| 21 | 25 (sonraki döneme taşar) | 0 | 0 | 0 → sonraki dönemde de devam |

### Notlar
- `gorev_turu_yemek_hakki = true` veya `NULL` ise normal hesap yapılır; GGYK uygulanmaz.
- GG bir sonraki döneme taşıyorsa: o dönemde de `gg_bas = donem_baslangic`, `gg_bit = min(bitis, donem_bitis)` mantığı tekrar çalışır.
- İzin hareketleri (rapor, yıllık vb.) ayrıca işlenmeye devam eder.

---

## 4) Veri kaynak tablosu

| Sütun | Tablo | Açıklama |
|-------|-------|----------|
| `gorev_turu` | `calisan` | 'Aylıksız İzin' / 'Yarı Zamanlı' / 'Geçici Görevlendirme' |
| `gorev_turu_tarihi` | `calisan` | Başlangıç tarihi |
| `gorev_turu_bitis_tarihi` | `calisan` | Bitiş tarihi (yeni) |
| `gorev_turu_yemek_hakki` | `calisan` | Geçici görev yemek hakkı boolean (yeni) |

---

## 5) Kritik kod dosyaları

| Dosya | Rol |
|-------|-----|
| `src/lib/ayy-hesap.ts` | `ayyHesapla` — SBAY parametreleri burada işlenir |
| `src/lib/ayy-donem-havuz.ts` | `ayyLoadStatuBazliPersonel` — calisan sorgusu |
| `src/lib/gorev-bilgileri.ts` | Tip tanımları ve yardımcı fonksiyonlar |

---

## 6) Hatırlatıcı kuralı (Görev Hatırlatıcıları widget)

- `gorev_turu_bitis_tarihi` → bugün + 15 gün içindeyse hatırlatıcı gösterilir.
- `engelli_bitis` → bugün + 15 gün içindeyse hatırlatıcı gösterilir.
- Widget ana sayfada (`/`) gösterilir.
