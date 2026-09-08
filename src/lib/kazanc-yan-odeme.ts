/** TH sınıfı kadro unvanlarında yan ödeme iki sütunda tutulur. */
export const YAN_ODEME_EKSI5_ETIKET = '-5 Yıl Yan Ödeme'
export const YAN_ODEME_ARTI5_ETIKET = '+5 Yıl Yan Ödeme'

export function unvanSinifiThMi(sinif: string | null | undefined): boolean {
  return (sinif ?? '').trim().toLocaleUpperCase('tr-TR') === 'TH'
}

export function parseKidemYili(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number.parseInt(String(v).trim(), 10)
  return Number.isFinite(n) ? n : null
}

/** TH: kıdem 0–4 → −5 yıl sütunu; 5 ve üzeri (25’e kadar) → +5 yıl sütunu */
export function thKidemEksi5BandiMi(kidem: number | null): boolean {
  return kidem != null && kidem >= 0 && kidem <= 4
}

export function thYanOdemeKuralEtiket(kidem: number | null, thMi: boolean): string {
  if (!thMi) return 'Yan Ödeme'
  return thKidemEksi5BandiMi(kidem) ? YAN_ODEME_EKSI5_ETIKET : YAN_ODEME_ARTI5_ETIKET
}

export type YanOdemeTanim = {
  yan_odeme: string | null
  yan_odeme_eksi5: string | null
}

/**
 * TH personelde uygulanacak yan ödeme: kıdem 0–4 ise tanımdaki −5 yıl sütunu,
 * aksi halde +5 yıl sütunu (`yan_odeme`). Diğer sınıflarda hep `yan_odeme`.
 */
export function thYanOdemeTanimdan(
  tanim: YanOdemeTanim | null | undefined,
  kidem: number | null,
  thMi: boolean,
): string | null {
  if (!tanim) return null
  if (thMi && thKidemEksi5BandiMi(kidem)) return tanim.yan_odeme_eksi5 ?? null
  return tanim.yan_odeme ?? null
}
