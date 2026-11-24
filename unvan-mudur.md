# Unvan / Müdür / Organizasyon — geliştirme planı

Bağlam kopmasın diye sıra ve kararlar burada tutulur.

## Hedef

1. Unvan sayfasında sütun açıklamaları (hover).
2. Unvan: **Müdür mü?** + **Kadro türü** (metinde «müdürü» aramayı bırakmak için).
3. Müdürlük: **Zorunlu mu?** (Evet/Hayır).
4. Personel hareketinde (Temmuz sonrası) müdür unvanlı kadro değişince organizasyon şemasını  
   `Organizasyon Şeması - YYYY/sıra` adıyla yeni kayıt olarak kaydet; önceki aktif kalsın.

«Müdür mü?» işaretlenene kadar eski «adında müdürü geçen» mantığı geçiş sürecinde kalabilir;  
sonra ilgili yerler (harcama yetkilileri, org şeması eşlemesi, vb.) bayrağa taşınır.

---

## Sıra

### 1) Unvan sütun hover açıklamaları
- Sayfa: `/tanimlar/unvan`
- **Unvan Adı’ndan sonraki** sütun başlıklarına fareyle gelince açıklama (Eğitim İstatistiği log hover benzeri).
- Mevcut: Sınıf, Arazi, Destek/Yrd., Katsayı, Durum (+ yeni sütunlar eklenince onlar da).

### 2) Unvan alanları (öneri)
- `mudur_mu` boolean — birim amiri / harcama yetkilisi adayı müdür unvanı.
- `kadro_turu` text — `diger` | `idari` | `zorunlu` (boş olabilir). İdari = (IV) sayılı liste idari personel kadro unvanları; sınıf sütunu ayrıdır.
- Seed: `20261124110000_unvan_kadro_turu_idari_iv.sql` — listedeki unvanlar `idari` işaretlendi (Şef / Zabıta Memuru IV dışı, işaretlenmedi).
- Migration + Unvan ekranı (liste / toplu / modal) + actions.
- Destek/Yrd. aynı kalır (kazanç +1300 istisnası); Müdür mü? ile karışmaz.

### 3) Müdürlük: Zorunlu mu?
- `tanim_mudurluk.zorunlu_mu` boolean.
- Tanımlar › Müdürlük ekranı + actions + hover açıklama.

### 4) Organizasyon şeması otomatik sürüm
- Tetik: Personel hareketi kaydı (ekle/güncelle), hareket tarihi **2026-07-01 ve sonrası**.
- Koşul: Değişen kadro unvanı **Müdür mü? = Evet** (geçişte henüz işaret yoksa adı «müdürü» içeren unvan).
- İşlem:
  1. Aktif organizasyonu kopyala (birimler dahil).
  2. Yeni ad: `Organizasyon Şeması - {yıl}/{sıra}` (o yıldaki otomatik sürüm sayısı + 1).
  3. Eski aktif → pasif; yeni → aktif.
- Kadro/unvan eşlemesi org birimlerindeki personel ile güncellenir (mevcut org müdür çözümleme kuralları).

### 5) Sonra (ayrı tur — kontrol ile)
- Harcama birim yetkilileri, org müdür indeksi, performans amiri vb. yerlerde  
  `mudur_mu` bayrağına geçiş; «müdürü» metin aramasını kaldırma.
- Gerekirse bir kerelik: adı müdürü içeren unvanları `mudur_mu = true` işaretle (SQL / toplu).

---

## Migration dosyaları

- `supabase/migrations/20261124100000_unvan_mudur_kadro_turu.sql`
- `supabase/migrations/20261124101000_mudurluk_zorunlu.sql`

Supabase SQL editöründe bir kez çalıştırılacak.

---

## Durum (uygulama)

| Madde | Durum |
|-------|--------|
| 1 Hover açıklamalar | Yapıldı (`SutunAciklama` + Unvan sütunları) |
| 2 mudur_mu + kadro_turu | Yapıldı (migration + UI + actions) |
| 3 mudurluk zorunlu_mu | Yapıldı (migration + UI + actions) |
| 4 Org şema sürümü | Yapıldı (önce dondur → kopyala → yeniye güncel müdür snapshot) |
| 4b Müdürlük Kadro Durumu | Yapıldı (eşleşen unvan `kadro_turu`) |
| 5 İlgili yerlerde bayrağa geçiş | Bekliyor (kontrol turu) |

## Notlar

- Destek/Yrd. = kazanç kuralı (11 Eyl 2026); Müdür mü? = rol / rapor / org.
- Canlıya almadan önce migration’ların Supabase’te çalıştırıldığını doğrula.
- Bu dosya Intrada kökünde; commit’e dahil edilebilir.
