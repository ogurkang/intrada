# Excel İndirme Yapısı – Talimat Dokümanı

Bu dokümanda **Aylık Yemek** ve **Yevmiye Puantaj** modüllerindeki Excel oluşturma ve indirme yapısı açıklanmaktadır.

---

## 1. Aylık Yemek (AYY)

### Kullanılan Kütüphane
- **xlsx-js-style** (^1.2.0) – SheetJS tabanlı, hücre stilleri destekli Excel kütüphanesi

### Mimari
- **Sunucu tarafı (API Route):** Excel dosyası oluşturulur
- **İstemci tarafı (Client Component):** `fetch` ile API çağrılır, gelen blob indirilir

### API Route
- **Dosya:** `src/app/api/kesintiler/ayy/excel/route.ts`
- **URL:** `GET /api/kesintiler/ayy/excel?donem_id={id}&tip={ozet|kategorik}`

### İstemci Tarafı (AyyDetayClient.tsx)

```typescript
async function excelIndir(tip: 'ozet' | 'kategorik') {
  try {
    const res = await fetch(`/api/kesintiler/ayy/excel?donem_id=${donemId}&tip=${tip}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err?.error ?? 'Excel indirilemedi.')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Aylik_Yemek_${donemAdi}${suffix}.xlsx`.replace(/[:\*\?\/\\]/g, ' ')
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    alert('Excel indirilemedi.')
  }
}
```

### Sunucu Tarafı Özet
1. `donem_id` ve `tip` parametreleri alınır
2. Supabase üzerinden dönem, izin hareketleri, tatiller vb. veriler çekilir
3. `ayyHesapla()` ile hesaplama yapılır
4. `mergeSatir()` ve `applyGridBorders()` ile tablo yapısı oluşturulur
5. `XLSX.utils.aoa_to_sheet()` ile worksheet oluşturulur
6. `XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })` ile buffer üretilir
7. `NextResponse(buf, { headers: { Content-Type, Content-Disposition } })` ile dosya döndürülür

---

## 2. Yevmiye Puantaj

### Kullanılan Kütüphane
- **xlsx-js-style** (^1.2.0)

### Mimari
- **Sunucu tarafı (API Route):** Excel dosyası oluşturulur
- **İstemci tarafı (Client Component):** `fetch` ile API çağrılır, gelen blob indirilir

### API Route
- **Dosya:** `src/app/api/kesintiler/yevmiye/excel/route.ts`
- **URL:** `GET /api/kesintiler/yevmiye/excel?donem_id={id}&mudurluk={adi}&statu={Sözleşmeli|İşçi}`

### İstemci Tarafı (YevmiyePuantajClient.tsx)

```typescript
async function excelIndir() {
  try {
    const res = await fetch(
      `/api/kesintiler/yevmiye/excel?donem_id=${donemId}&mudurluk=${encodeURIComponent(seciliMudurluk)}&statu=${encodeURIComponent(seciliStatu)}`
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err?.error ?? 'Excel indirilemedi.')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Yevmiye_Puantaj_${donemAdi}_${mudurlukAdi}.xlsx`.replace(/[:\*\?\/\\]/g, ' ')
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Excel indir hatası:', e)
    alert('Excel indirilemedi.')
  }
}
```

### Sunucu Tarafı Özet
1. `donem_id`, `mudurluk`, `statu` parametreleri alınır
2. **Doğrudan Supabase** ile veriler çekilir (`createClient()` – Server Action kullanılmaz, Route Handler context hatasını önlemek için)
3. Başlık satırları: T.C., ADAPAZARI BELEDİYESİ, müdürlük adı, SÖZLEŞMELİ/İŞÇİ PUANTAJ ÇİZELGESİ, Dönem
4. Tablo: Sıra No, Sicil No, Adı Soyadı, günlük sütunlar, özet sütunlar (N.Ç., H.T., FM NOR. vb.)
5. Açıklama satırı ve imza alanları (Puantör, Birim Amiri, Müdür)
6. `mergeSatir()` ve `applyGridBorders()` kullanılır
7. `XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })` ile buffer üretilir
8. `NextResponse(buf, { headers })` ile dosya döndürülür

---

## Ortak Yardımcılar

**Dosya:** `src/lib/kesintiler-excel.ts`

- `applyGridBorders(ws, rowCount, colCount)` – Tüm hücrelere ince kenarlık uygular
- `mergeSatir(text, colCount)` – Merge edilmiş başlık satırı oluşturur

---

## Hata Durumları

| Durum | HTTP | Açıklama |
|-------|------|----------|
| `donem_id` eksik/geçersiz | 400 | Parametre hatası |
| Dönem/veri bulunamadı | 404 | Veri yok |
| Excel oluşturma hatası | 500 | Sunucu hatası (try-catch) |

İstemci tarafında `res.ok` false ise `res.json()` ile hata mesajı alınır ve kullanıcıya gösterilir.
