/** TH sınıfı kadro unvanlarında yan ödeme iki sütunda tutulur. */
export const YAN_ODEME_EKSI5_ETIKET = '-5 Yıl Yan Ödeme'
export const YAN_ODEME_ARTI5_ETIKET = '+5 Yıl Yan Ödeme'
export const YAN_ODEME_EKSI5_KISA = '-5 Yıl'
export const YAN_ODEME_ARTI5_KISA = '+5 Yıl'

/** V.H.K.İ. / Bilgisayar İşletmeni */
export const YAN_ODEME_BILGISAYARLI_ETIKET = 'Bilgisayarlı Yan Ödeme'
export const YAN_ODEME_BILGISAYARSIZ_ETIKET = 'Bilgisayarsız Yan Ödeme'
export const YAN_ODEME_BILGISAYARLI_KISA = 'Bilgisayarlı'
export const YAN_ODEME_BILGISAYARSIZ_KISA = 'Bilgisayarsız'

export function unvanSinifiThMi(sinif: string | null | undefined): boolean {
  return (sinif ?? '').trim().toLocaleUpperCase('tr-TR') === 'TH'
}

/** Noktalama ve Türkçe harf farklarını silerek ünvan adını karşılaştırır. */
export function unvanAdiNorm(v: string | null | undefined): string {
  return String(v ?? '')
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9]/g, '')
}

export function unvanYanOdemeBilgisayarMi(unvanAdi: string | null | undefined): boolean {
  const n = unvanAdiNorm(unvanAdi)
  return n === 'VHKI' || n === 'BILGISAYARISLETMENI'
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

/** Uyum/sapma hücresinde gösterilen kısa kural (Yan Ödeme tek sütunsa boş). */
export function yanOdemeKuralKisa(
  kidem: number | null,
  thMi: boolean,
  unvanAdi?: string | null,
  bilgisayarKullaniyor?: boolean | null,
): string | null {
  if (unvanYanOdemeBilgisayarMi(unvanAdi)) {
    return bilgisayarKullaniyor === false ? YAN_ODEME_BILGISAYARSIZ_KISA : YAN_ODEME_BILGISAYARLI_KISA
  }
  if (!thMi) return null
  return thKidemEksi5BandiMi(kidem) ? YAN_ODEME_EKSI5_KISA : YAN_ODEME_ARTI5_KISA
}

export function yanOdemeNotlariBirlestir(...parcalar: (string | null | undefined)[]): string | null {
  const t = parcalar.map(p => String(p ?? '').trim()).filter(Boolean)
  return t.length ? [...new Set(t)].join(' · ') : null
}

export type YanOdemeTanim = {
  yan_odeme: string | null
  yan_odeme_eksi5: string | null
  yan_odeme_bilgisayarsiz?: string | null
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

/**
 * Personelin ünvanı + yetkinliğine göre tanımdan uygulanacak yan ödeme.
 * V.H.K.İ. / Bilgisayar İşletmeni: Kullanmıyor → bilgisayarsız sütun.
 */
export function yanOdemeTanimdan(
  tanim: YanOdemeTanim | null | undefined,
  kidem: number | null,
  thMi: boolean,
  unvanAdi?: string | null,
  bilgisayarKullaniyor?: boolean | null,
): string | null {
  if (!tanim) return null
  if (unvanYanOdemeBilgisayarMi(unvanAdi)) {
    if (bilgisayarKullaniyor === false) return tanim.yan_odeme_bilgisayarsiz ?? null
    return tanim.yan_odeme ?? null
  }
  return thYanOdemeTanimdan(tanim, kidem, thMi)
}
