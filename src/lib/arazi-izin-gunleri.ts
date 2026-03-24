import { turAdindanPuantajKodu } from '@/lib/izin-puantaj-kodu'

/** İki YYYY-MM-DD tarihi arası (dahil) tüm günler */
export function gunleriIkiTarihArasiInclusive(basStr: string, bitStr: string): string[] {
  const bas = basStr.slice(0, 10)
  const bit = bitStr.slice(0, 10)
  if (!bas || !bit || bas > bit) return []
  const out: string[] = []
  let current = bas
  while (current <= bit) {
    out.push(current)
    const d = new Date(current + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    current = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  return out
}

/** YYYY-MM-DD için bir önceki gün */
export function oncekiGunISO(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * İzin takvim günleri: `izin-gun.ts` / form ile uyumlu.
 * - `ayrilis` = iznin ilk günü
 * - `baslama` = işe dönüş günü (bu gün izinli sayılmaz; [ayrilis, baslama) yarı açık aralık)
 */
export function izinGunleriAyrilisBaslama(ayrilisStr: string | null, baslamaStr: string | null): string[] {
  const ilk = String(ayrilisStr ?? '').slice(0, 10)
  const donus = String(baslamaStr ?? '').slice(0, 10)
  if (!ilk || !donus) return []
  if (donus <= ilk) return []
  const son = oncekiGunISO(donus)
  if (son < ilk) return []
  return gunleriIkiTarihArasiInclusive(ilk, son)
}

export type IzinHareketAraziRow = {
  sicil_no: string | null
  baslama: string | null
  ayrilis: string | null
  tur: string | null
  durum: string | null
}

/**
 * İptal edilmemiş tüm izin hareketleri (Taslak dahil): sicil → gün → puantaj kodu.
 * Aynı günde birden fazla kayıt varsa Taslak önce yazılır, Onaylandı/Değiştirildi sonra (üstün).
 */
export function izinKodlariBySicilGunFromHareketler(
  rows: IzinHareketAraziRow[],
  donemBas: string,
  donemBit: string,
  turAdiToKod: Record<string, string>,
): Record<string, Record<string, string>> {
  const db = donemBas.slice(0, 10)
  const de = donemBit.slice(0, 10)

  const sorted = [...rows].sort((a, b) => {
    const ta = String(a.durum ?? '').trim() === 'Taslak' ? 0 : 1
    const tb = String(b.durum ?? '').trim() === 'Taslak' ? 0 : 1
    return ta - tb
  })

  const bySicil: Record<string, Record<string, string>> = {}

  for (const row of sorted) {
    const s = String(row.sicil_no ?? '').trim()
    if (!s || !row.baslama || !row.ayrilis) continue
    const tur = String(row.tur ?? '').trim()
    const kod = turAdindanPuantajKodu(tur, turAdiToKod)
    for (const iso of izinGunleriAyrilisBaslama(row.ayrilis, row.baslama)) {
      if (iso >= db && iso <= de) {
        if (!bySicil[s]) bySicil[s] = {}
        bySicil[s][iso] = kod
      }
    }
  }

  return bySicil
}
