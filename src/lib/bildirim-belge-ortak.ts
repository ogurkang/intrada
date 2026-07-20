/** Bildirim dilekçeleri — ortak metin ve tarih yardımcıları. */

export const BILDIRIM_MAKAM = 'ADAPAZARI BELEDİYE BAŞKANLIĞINA'
export const BILDIRIM_BIRIM = '(İnsan Kaynakları ve Eğitim Müdürlüğü)'

/** 11 haneli yalnızca rakam TCKN. */
export function bildirimTcknGecerliMi(tckn: string | null | undefined): boolean {
  return /^\d{11}$/.test(String(tckn ?? '').trim())
}

/** Tarihi gg.aa.yyyy biçiminde döndürür. */
export function bildirimTarihFormat(d: Date = new Date()): string {
  const gun = String(d.getDate()).padStart(2, '0')
  const ay = String(d.getMonth() + 1).padStart(2, '0')
  const yil = d.getFullYear()
  return `${gun}.${ay}.${yil}`
}

/** ISO veya yyyy-mm-dd girdisinden tarih. */
export function bildirimTarihParse(raw: string | null | undefined): Date | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const iso = s.length === 10 ? `${s}T12:00:00` : s
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d
}

/** Form date input → yyyy-mm-dd. */
export function bildirimTarihDb(raw: string | null | undefined): string | null {
  const d = bildirimTarihParse(raw)
  if (!d) return null
  return bildirimTarihDbFromDate(d)
}

/** Date → yyyy-mm-dd (yerel takvim günü). */
export function bildirimTarihDbFromDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${g}`
}
