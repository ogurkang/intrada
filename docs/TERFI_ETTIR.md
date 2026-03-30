# Terfi Ettir (%96 — geliştirme özeti)

Bu belge ürün adı **Terfi Ettir** ile kayıtlı iş kurallarını özetler.

## Dönem ve terfi tarih penceresi

- Her dönemin `baslangic_tarihi`–`bitis_tarihi` aralığı tanımlıdır.
- Listelenen **terfi tarihleri**, bir önceki döneme denk gelen takvim penceresidir: her iki sınır tarihten **bir ay geri** alınır (gün/ay korunarak).
- Örnek: dönem 15.03.2026–14.04.2026 → terfi tarihleri **15.02.2026–14.03.2026** (dahil).

## Hangi tarihler filtreye girer?

- **KHA terfi tarihi** (`kha_tarihi`) ve **EKEA terfi tarihi** (`ekea_tarihi`) bu pencerede mi bakılır.
- **Kıdem tarihi** (`kidem_tarihi`) de aynı dönem penceresine dahildir.
- KHA ve EKEA tarihleri **aynı gün** ise tek terfi hareketi gibi aynı D/K kuralı **ikisine birden** uygulanır.
- **Farklı günlerde** ise KHA ve EKEA ilerlemeleri **birbirinden bağımsız** hesaplanır (aynı personelde iki ayrı mantık).

## Kıdem yılı / kıdem tarihi kuralı

- `kidem_tarihi` dönem penceresine giriyorsa **1 yıl ileri** alınır.
- `kidem_yili` için kural: `min(25, kidem_yili + 1)`.
- Örnekler: `5 → 6`, `10 → 11`, `24 → 25`, `25 → 25` (tavan).
- `Durum / Uyarı` etiketi: kıdem yılı artışı olduğunda **`Kıdem Yılı İlerledi`** gösterilir.
- Renk: **mavi** (`bg-blue-100 text-blue-700`).

## Eğitim tabanlı derece tabanı

- **Lise** mezunu: minimum **3.** derece.
- **Ön Lisans** ve **Lisans** mezunları: minimum **1.** derece.

## İlerleme mantığı (KHA veya EKEA D/K)

`mevcutKademe` ve `mevcutDerece` sayısal; eğitim tabanı `minDerece`.

1. `mevcutKademe < 3` → yalnızca kademe **+1**; **puanlar değişmez**.
2. `mevcutKademe === 3` ve derece eğitim sınırında **değilse** (`derece > minDerece`) → derece **−1**, kademe **1**; derece değiştiyse kazanç tablosundan puanlar.
3. `mevcutKademe === 3` ve derece **sınırda** (`derece === minDerece`) → derece **aynı**, kademe **4**; puanlar genelde aynı kalır (örnek senaryo).
4. Üst tavan / eğitim sınırı (ör. 1/4) → değişiklik yok.

## Puan güncellemesi (tanim_kazanc_bilgisi)

Derece **değiştiyse**: `unvan_id`, öğrenim (`ogrenim_id`) ve **yeni derece** ile `tanim_kazanc_bilgisi` satırı bulunur; **Ek Gösterge, ÖHT, Ek Ödeme, Yan Ödeme, SDS** yeni değerler olarak yazılır.

## Arayüz

- **`/terfi`** — Dönem listesi + **Yeni Dönem** (Arazi Puantajı kalıbı); **Terfi Bilgileri** ile terfi tablosuna geçiş.
- **`/terfi/bilgiler`** — Mevcut terfi kayıt / toplu güncelleme ekranı (`TerfiClient`).
- **`/terfi/donem/[id]`** — Dönem özeti, terfi tarih penceresi açıklaması ve **aynı sayfada** Terfi Ettir önizleme tablosu; satır seçimi + **Terfi Ettir** ile `terfi_hareketleri` güncellenir; Excel indir.
- Önizleme sütunlarında KHA/EKEA yanında **Kıdem Tarihi** ve **Kıdem Yılı (eski→yeni)** de gösterilir.
- **`/terfi/donem/[id]/terfi-ettir`** — Eski bağlantılar için `/terfi/donem/[id]` adresine yönlendirilir.

## Veritabanı

- Tablo: `terfi_donem` (migration: `20260330120000_terfi_donem.sql`).
