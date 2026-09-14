import { ggAayyyyToIso } from '@/lib/tarih'

export const TH_SINIF_HIZMET_DURUM = 'TH Sınıfında 5 Yıl Geçti'
export const TH_HIZMET_SURESI_5_YIL_NOTU = TH_SINIF_HIZMET_DURUM

function isoGun(v: string | Date | null | undefined): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const t = String(v ?? '').trim().slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null
}

function parseLocalIso(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return isNaN(d.getTime()) ? null : d
}

function yilDonumu(bas: Date, yil: number): Date {
  const gun = Math.min(bas.getDate(), new Date(yil, bas.getMonth() + 1, 0).getDate())
  return new Date(yil, bas.getMonth(), gun)
}

/** Tamamlanan takvim yılı (5. yıl dönümü günü = 5). */
export function thHizmetTamYil(
  baslangic: string | null | undefined,
  referans?: string | Date | null,
): number | null {
  const bIso = isoGun(baslangic)
  const rIso = isoGun(referans ?? new Date()) ?? isoGun(new Date())
  if (!bIso || !rIso) return null
  const b = parseLocalIso(bIso)
  const r = parseLocalIso(rIso)
  if (!b || !r || r < b) return r && b && r < b ? 0 : null
  let yil = r.getFullYear() - b.getFullYear()
  if (r < yilDonumu(b, r.getFullYear())) yil -= 1
  return Math.max(0, yil)
}

export type ThHizmetBilesen = { yil: number; ay: number; gun: number }

/** Takvim günüyle yıl / ay / gün. */
export function thHizmetBilesen(
  baslangic: string | null | undefined,
  referans?: string | Date | null,
): ThHizmetBilesen | null {
  const bIso = isoGun(baslangic)
  const rIso = isoGun(referans ?? new Date()) ?? isoGun(new Date())
  if (!bIso || !rIso) return null
  const b = parseLocalIso(bIso)
  const r = parseLocalIso(rIso)
  if (!b || !r) return null
  if (r < b) return { yil: 0, ay: 0, gun: 0 }

  let yil = r.getFullYear() - b.getFullYear()
  let ay = r.getMonth() - b.getMonth()
  let gun = r.getDate() - b.getDate()
  if (gun < 0) {
    ay -= 1
    const oncekiAySon = new Date(r.getFullYear(), r.getMonth(), 0).getDate()
    gun += oncekiAySon
  }
  if (ay < 0) {
    yil -= 1
    ay += 12
  }
  return { yil: Math.max(0, yil), ay: Math.max(0, ay), gun: Math.max(0, gun) }
}

export function thHizmetSuresiEtiket(
  baslangic: string | null | undefined,
  referans?: string | Date | null,
): string | null {
  const b = thHizmetBilesen(baslangic, referans)
  if (!b) return null
  return `${b.yil} yıl ${b.ay} ay ${b.gun} gün`
}

/** 5. yıl dönümü (ISO). */
export function thBesinciYilDonumuIso(baslangic: string | null | undefined): string | null {
  const bIso = isoGun(baslangic)
  if (!bIso) return null
  const b = parseLocalIso(bIso)
  if (!b) return null
  const d = yilDonumu(b, b.getFullYear() + 5)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const gun = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${gun}`
}

export function thHizmetAlaniGosterMi(
  asilTh: boolean,
  baslangic: string | null | undefined,
): boolean {
  return asilTh || Boolean(String(baslangic ?? '').trim())
}

/** TH yan ödeme yılı: tarih varsa takvim yılı, yoksa kıdem yılı (eski davranış). */
export function thYanOdemeYilSec(opts: {
  thMi: boolean
  thHizmetBaslangic: string | null | undefined
  kidemYili: number | null
  referansTarih?: string | Date | null
}): number | null {
  if (opts.thMi) {
    const y = thHizmetTamYil(opts.thHizmetBaslangic, opts.referansTarih)
    if (y != null) return y
  }
  return opts.kidemYili
}

export function thHizmetTarihiKaydet(ham: string | null | undefined): { iso: string | null; hata?: string } {
  const t = String(ham ?? '').trim()
  if (!t) return { iso: null, hata: 'Teknik hizmet yılı tarihi girilmelidir.' }
  const iso = ggAayyyyToIso(t)
  if (!iso) return { iso: null, hata: 'Geçerli bir tarih seçilmelidir.' }
  return { iso }
}

export type ThHizmetYiliSatir = {
  sicil_no: string
  public_id: string
  ad_soyad: string
  tckn: string | null
  deger: string | null
  kadro_unvani: string | null
  gorev_unvani: string | null
}
