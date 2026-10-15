import { excelRound2 } from '@/lib/ayliktan-kesme-hesap'
import { EN_YUKSEK_DEVLET_MEMURU_GOSTERGE } from '@/lib/ayliktan-kesme-katsayi'

/** 657 sayılı Kanun m. 208: memurun ölümü halinde en yüksek devlet memuru aylığının katı. */
export const OLUM_YARDIMI_KAT = 2

export const OLUM_YARDIMI_GOSTERGE = EN_YUKSEK_DEVLET_MEMURU_GOSTERGE

export const OLUM_YARDIMI_DAYANAK =
  '657 sayılı Devlet Memurları Kanunu m. 208: memurun ölümü halinde en yüksek Devlet memuru aylığının (ek gösterge dahil) iki katı tutarında ölüm yardımı ödenir. Aylık, 9.500 gösterge ile memur aylık katsayısının çarpımıdır. Bu tutar varis sayısına bölünür. Payların toplamı yardım tutarına eşittir. Yardım vergiye ve kesintiye tabi değildir.'

export type OlumVaris = {
  tckn: string
  adSoyad: string
  iban: string
  tutar: number
}

export type OlumBelge = {
  sicil_no: string
  ad_soyad: string
  tckn: string
  unvan: string
  gosterge: number
  maasKatsayi: number
  aylik: number
  kat: number
  toplam: number
  varisler: OlumVaris[]
  dayanak: string
}

function kurusa(n: number): number {
  return Math.round(excelRound2(n) * 100)
}

/** Her pay kuruşa yuvarlanır. Payların kuruş toplamı yardımın kuruş toplamına eşittir. */
export function olumYardimiPaylastir(toplam: number, varisSayisi: number): number[] {
  if (varisSayisi <= 0) return []
  const kurus = kurusa(toplam)
  const taban = Math.floor(kurus / varisSayisi)
  const kalan = kurus - taban * varisSayisi
  return Array.from({ length: varisSayisi }, (_, i) => (taban + (i < kalan ? 1 : 0)) / 100)
}

export function olumYardimiHesapla(girdi: {
  gosterge: number
  maasKatsayi: number
  varisSayisi: number
}): { gosterge: number; aylik: number; kat: number; toplam: number; paylar: number[] } | { hata: string } {
  if (!(girdi.gosterge > 0)) return { hata: 'Gösterge sıfırdan büyük olmalıdır.' }
  if (!(girdi.maasKatsayi > 0)) return { hata: 'Aylık katsayı sıfırdan büyük olmalıdır.' }
  if (girdi.varisSayisi < 1) return { hata: 'En az bir varis girin.' }
  const aylik = excelRound2(girdi.gosterge * girdi.maasKatsayi)
  const toplam = kurusa(aylik * OLUM_YARDIMI_KAT) / 100
  const paylar = olumYardimiPaylastir(toplam, girdi.varisSayisi)
  return { gosterge: girdi.gosterge, aylik, kat: OLUM_YARDIMI_KAT, toplam, paylar }
}

export function tcknUygun(raw: string): boolean {
  return /^\d{11}$/.test(raw.trim())
}

export function ibanTemizle(raw: string): string {
  return raw.replace(/\s/g, '').toUpperCase()
}

/** Yazarken TR ve dörderli gruplara çevirir. */
export function ibanYaz(raw: string): string {
  let s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (s.startsWith('TR')) s = 'TR' + s.slice(2).replace(/\D/g, '')
  else s = 'TR' + s.replace(/\D/g, '')
  s = s.slice(0, 26)
  return s.replace(/(.{4})(?=.)/g, '$1 ').trim()
}

export function ibanUygun(raw: string): boolean {
  const s = ibanTemizle(raw)
  if (!/^TR\d{24}$/.test(s)) return false
  const rearranged = s.slice(4) + s.slice(0, 4)
  let numeric = ''
  for (const ch of rearranged) {
    numeric += ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch
  }
  let kalan = 0
  for (const ch of numeric) kalan = (kalan * 10 + Number(ch)) % 97
  return kalan === 1
}

export function ibanUyari(raw: string): string | null {
  const s = ibanTemizle(raw)
  if (!s || s === 'TR') return null
  if (!/^TR\d{24}$/.test(s)) return 'IBAN, TR ile başlar ve 26 karakterdir. Örnek: TR00 0000 0000 0000 0000 0000 00'
  if (!ibanUygun(s)) return 'IBAN kontrol hanesi tutmuyor. Rakamları yeniden kontrol edin.'
  return null
}

export function olumBelgeCoz(raw: unknown): OlumBelge | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as OlumBelge
  if (!Array.isArray(b.varisler) || typeof b.toplam !== 'number' || !b.sicil_no) return null
  return b
}

const OLUM_AUDIT = [
  { alan: 'ad_soyad', etiket: 'Ad Soyad' },
  { alan: 'unvan', etiket: 'Unvan' },
  { alan: 'gosterge', etiket: 'Gösterge' },
  { alan: 'maasKatsayi', etiket: 'Aylık katsayı' },
  { alan: 'toplam', etiket: 'Ölüm yardımı' },
  { alan: 'varis_sayisi', etiket: 'Varis sayısı' },
]

export function olumAuditGovde(belge: OlumBelge) {
  return {
    ad_soyad: belge.ad_soyad,
    unvan: belge.unvan,
    gosterge: belge.gosterge,
    maasKatsayi: belge.maasKatsayi,
    toplam: belge.toplam,
    varis_sayisi: belge.varisler.length,
  }
}

export function olumAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  return auditFark(OLUM_AUDIT, onceki, sonraki)
}

export function olumAuditDegerGoster(_alan: string, deger: unknown): string {
  const v = deger == null ? '' : String(deger).trim()
  return v || '—'
}

function auditFark(
  alanlar: { alan: string; etiket: string }[],
  onceki: unknown,
  sonraki: unknown,
) {
  const o = (onceki ?? {}) as Record<string, unknown>
  const s = (sonraki ?? {}) as Record<string, unknown>
  const rows: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  for (const { alan, etiket } of alanlar) {
    const ov = o[alan]
    const sv = s[alan]
    if (onceki == null) {
      if (sv != null && String(sv) !== '') rows.push({ alan, etiket, onceki: null, sonraki: sv })
      continue
    }
    if (String(ov ?? '') !== String(sv ?? '')) rows.push({ alan, etiket, onceki: ov ?? null, sonraki: sv ?? null })
  }
  return rows
}
