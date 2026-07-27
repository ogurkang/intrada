# Performans — Amir UX İyileştirme Planı

> Bağlam kopması durumunda bu dosyadan devam edilir. Son güncelleme: 2026-07-24

## Kararlar (onaylı)

| Konu | Karar |
|------|--------|
| Admin ekranı | Aynen kalır (`PerformansDonemDashboardClient`, müdürlük hub) |
| BBY 1. amir | Yalnızca kendisine bağlı **müdürleri** puanlar |
| Başkan personel | Müdürlük detayı yeterli |
| Amir listeleri | Tamamlanan + bekleyen **hepsi** görünsün |
| 2. amir formu | Sol: 1. amir salt okunur · Sağ: 2. amir düzenler |
| 2. amir özet | `1. amir toplam: X · 2. amir toplam: Y` (fark satırı yok) |
| Hızlı bant popup | Onay sorusu yok; **Kaydet Kapat / Kaydet 2. Amire Gönder / Kaydet Devam Et** |
| Hızlı bant dağıtım | Deterministik eşit (band ortası hedef toplam) |

## Uygulama sırası

| Aşama | Durum | Açıklama |
|-------|--------|----------|
| **A** | ✅ | 2. amir çift sütun form (`PerformansFormClient`) |
| **B** | ✅ | Hızlı puanlama bantları + aksiyon popup (`performans-hizli-bant.ts`) |
| **C** | ✅ | Müdür landing — tek ekran, müdürlük gruplu personel |
| **D** | ✅ | BBY 1. amir — müdür listesi + devam et + SMS |
| **E** | ✅ | BBY 2. amir — müdür → müdürlük hiyerarşisi |
| **F** | ✅ | Başkan landing — müdür/BBY + müdürlük detay |

## A — 2. amir çift sütun

- Dosya: `src/components/performans/PerformansFormClient.tsx`
- Sol sütun: `puan_amir1`, `YildizPuan` disabled
- Sağ sütun: düzenlenebilir `puanlar` (kaydedilen `puan_amir2`)
- Satır farkı varsa hafif vurgu (`border-amber-200`)
- Form genişliği: `max-w-4xl`

## B — Hızlı puanlama

- Dosya: `src/lib/performans-hizli-bant.ts`
- Bantlar (UI etiketi → aralık):
  - Çok İyi (90–100)
  - İyi (75–89)
  - Yeterli (60–74) — kodda `PERF_PUAN_BANDA` “Orta”
  - Yetersiz (35–59)
  - Çok Yetersiz (0–34)
- Algoritma: hedef toplam = `(min+max)/2`, kriter başına 1–5 yıldız deterministik dağıtım
- Popup (amir1): Kaydet Kapat · Kaydet 2. Amire Gönder · Kaydet Devam Et
- Popup (amir2): Kaydet Kapat · Kaydet Devam Et (onayla + sıradaki); 2. amire gönder yok
- Amir2 taslak: `performansAmir2Kaydet({ islem: 'kaydet' })`

## C — Müdür landing

- Amir `/performans/degerlendirme/[donem_id]` → müdürlük hub atlanır
- Tek sayfa: müdürlük başlıkları + personel satırları (çok müdürlük alt alta)
- Admin route aynı kalır

## D — BBY 1. amir

- Liste: yalnızca bağlı müdürler
- Kaydet · devam et → sıradaki müdür
- Son müdür → SMS popup (mevcut `performansSonrakiDegerlendirmeBul`)

## E — BBY 2. amir

- Müdür başlıkları altında müdürlükler
- Detay → personel listesi → form

## F — Başkan

- Üst liste: müdür + BBY (doğrudan puanlama)
- Müdürlük linkleri: personel detayı

## İlgili dosyalar

| Dosya | Rol |
|-------|-----|
| `PerformansFormClient.tsx` | Değerlendirme formu |
| `PerformansDonemDashboardClient.tsx` | Admin + geçici amir hub |
| `performans-hizli-bant.ts` | Bant dağıtım helper |
| `performans-amir-erisim.ts` | Rol / müdürlük kapsamı |
| `performans/actions.ts` | Kaydet / gönder / onayla |
| `performansSonrakiDegerlendirmeBul` | Devam et sırası + SMS tetik |

## Notlar

- Admin “1/2” kısayol düğmeleri: `AdminAmirDegerlendirmeButon` (indigo-950), `intrada-icon-btn-*` kaldırıldı
- SMS test: 05322804987, originator ADPZRIBLD
