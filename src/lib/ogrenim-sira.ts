/**
 * Öğrenim türü görüntüleme sırası (yukarıdan aşağıya).
 * Tanımlar modülü listesi, formlar ve raporlar bu sırayı kullanır.
 * Tanımda olup burada olmayan türler sonda, metin sırasına göre.
 */
export const OGRENIM_TURU_SIRA: readonly string[] = [
  'Okuma-Yazma Yok',
  'Okur-Yazar',
  'İlkokul',
  'Ortaokul',
  'İlköğretim',
  'Lise',
  'Meslek Lisesi',
  'Önlisans',
  'Lisans',
  'Yüksek Lisans',
  'Doktora',
] as const

const CANONICAL: Record<string, string> = {
  'ön lisans': 'Önlisans',
  'onlisans': 'Önlisans',
  'önlisans': 'Önlisans',
}

function normalizeForCompare(s: string): string {
  const t = s.trim().toLowerCase()
  return CANONICAL[t] ?? s.trim()
}

/** Küçük/büyük harf ve eş anlamlı varyantlar için sıra indeksi (bilinmeyen: büyük sayı). */
export function ogrenimTuruSiraIndex(ogrenimTuru: string | null | undefined): number {
  const raw = (ogrenimTuru ?? '').trim()
  if (!raw) return 9999
  const n = normalizeForCompare(raw)
  let idx = OGRENIM_TURU_SIRA.findIndex((x) => x.toLowerCase() === n.toLowerCase())
  if (idx >= 0) return idx
  idx = OGRENIM_TURU_SIRA.findIndex(
    (x) => n.toLowerCase().includes(x.toLowerCase()) || x.toLowerCase().includes(n.toLowerCase())
  )
  if (idx >= 0) return idx
  return 9000
}

export function sortCalisanOgrenimByTuru<T extends { ogrenim_turu?: string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ia = ogrenimTuruSiraIndex(a.ogrenim_turu)
    const ib = ogrenimTuruSiraIndex(b.ogrenim_turu)
    if (ia !== ib) return ia - ib
    return String(a.ogrenim_turu ?? '').localeCompare(String(b.ogrenim_turu ?? ''), 'tr')
  })
}

/** Bildirim listesi: önce sicil, aynı sicilde öğrenim türü sırası. */
export function sortBildirimOgrenimList<T extends { sicil_no: string; ogrenim_turu?: string | null }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    const cmp = String(a.sicil_no).localeCompare(String(b.sicil_no), undefined, { numeric: true })
    if (cmp !== 0) return cmp
    const ia = ogrenimTuruSiraIndex(a.ogrenim_turu)
    const ib = ogrenimTuruSiraIndex(b.ogrenim_turu)
    if (ia !== ib) return ia - ib
    return String(a.ogrenim_turu ?? '').localeCompare(String(b.ogrenim_turu ?? ''), 'tr')
  })
}

/** Tanımlar > Öğrenim kayıtları ve aynı şekilde `isim` alanlı satırlar için liste sırası. */
export function sortTanimOgrenimByIsim<T extends { isim: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ia = ogrenimTuruSiraIndex(a.isim)
    const ib = ogrenimTuruSiraIndex(b.isim)
    if (ia !== ib) return ia - ib
    return a.isim.localeCompare(b.isim, 'tr')
  })
}

/** Rapor sütunları vb. yalnızca isim dizisi için. */
export function sortOgrenimIsimListesi(isimler: string[]): string[] {
  return [...isimler].sort((a, b) => {
    const ia = ogrenimTuruSiraIndex(a)
    const ib = ogrenimTuruSiraIndex(b)
    if (ia !== ib) return ia - ib
    return a.localeCompare(b, 'tr')
  })
}
