import { type TanimStatuRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { statuEtiketSirasi } from '@/lib/rapor-statuye-gore-ogrenim-meslek'

export const FIRMA_STATU_ETIKET = 'Firma Personel'
export const TANIMSIZ_STATU_ETIKET = 'Tanımda olmayan statü'

/** Tanımlar > Statü sırası (sira_no); eşleşmeyenler için gruplama anahtarı. */
export function statuEtikettenSiralamaAnahtari(rawEtiket: string, statuSirali: string[]): string {
  const t = rawEtiket.trim()
  if (t === FIRMA_STATU_ETIKET) return FIRMA_STATU_ETIKET
  if (statuSirali.includes(t)) return t
  return TANIMSIZ_STATU_ETIKET
}

export function statuListeSiraIndeksi(anahtar: string, statuSirali: string[]): number {
  if (anahtar === FIRMA_STATU_ETIKET) return statuSirali.length + 1
  if (anahtar === TANIMSIZ_STATU_ETIKET) return statuSirali.length
  const i = statuSirali.indexOf(anahtar)
  return i >= 0 ? i : statuSirali.length
}

export function hazirlaStatuSirali(tanimStatuler: TanimStatuRow[]): {
  statuSirali: string[]
  etiketler: Set<string>
} {
  const statuSirali = statuEtiketSirasi(tanimStatuler)
  return { statuSirali, etiketler: new Set(statuSirali) }
}

function sicilSayisal(s: string | null | undefined): number {
  const n = parseInt(String(s ?? '').replace(/\D/g, '') || '0', 10)
  return Number.isFinite(n) ? n : 0
}

/** Liste / görev / hizmet süreleri tablolarında ortak sıra: tanımlı statü sırası → tanımsız → firma. */
export function karsilastirStatuSonraSicilAd(
  a: { statuEtiket: string; sicil_no: string | null; ad_soyad: string },
  b: { statuEtiket: string; sicil_no: string | null; ad_soyad: string },
  statuSirali: string[],
): number {
  const anaA = statuEtikettenSiralamaAnahtari(a.statuEtiket, statuSirali)
  const anaB = statuEtikettenSiralamaAnahtari(b.statuEtiket, statuSirali)
  const ia = statuListeSiraIndeksi(anaA, statuSirali)
  const ib = statuListeSiraIndeksi(anaB, statuSirali)
  if (ia !== ib) return ia - ib
  const sa = sicilSayisal(a.sicil_no)
  const sb = sicilSayisal(b.sicil_no)
  if (sa !== sb) return sa - sb
  return a.ad_soyad.localeCompare(b.ad_soyad, 'tr')
}
