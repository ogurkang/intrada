/** Cari yıl = güncel yılın ilk ve son günü dahil tarih aralığı */
export function getCariYilAraligi(yil?: number) {
  const y = yil ?? new Date().getFullYear()
  return {
    yil: y,
    baslangic: new Date(y, 0, 1),
    bitis: new Date(y, 11, 31),
    baslangicStr: `${y}-01-01`,
    bitisStr: `${y}-12-31`,
  }
}

function ikiHane(n: number): string {
  return String(n).padStart(2, '0')
}

/** Date → gg.aa.yyyy (Excel UTC gece yarısı kaymasını önler). */
export function formatDateGgAayyyy(d: Date): string {
  if (isNaN(d.getTime())) return ''
  const utcSaat = d.getUTCHours()
  if (utcSaat === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
    return `${ikiHane(d.getUTCDate())}.${ikiHane(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`
  }
  return `${ikiHane(d.getDate())}.${ikiHane(d.getMonth() + 1)}.${d.getFullYear()}`
}

/** gg.aa.yyyy, gg/aa/yyyy, gg-aa-yyyy veya yyyy-mm-dd metnini Date'e çevirir. */
export function parseTarihEsnek(s: string | null | undefined): Date | null {
  const t = String(s ?? '').trim()
  if (!t) return null
  const tr = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/)
  if (tr) {
    const gun = Number(tr[1])
    const ay = Number(tr[2])
    let yil = Number(tr[3])
    if (yil < 100) yil += 2000
    if (ay < 1 || ay > 12 || gun < 1 || gun > 31) return null
    const d = new Date(yil, ay - 1, gun)
    return isNaN(d.getTime()) ? null : d
  }
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  return null
}

/** Metin veya Date → gg.aa.yyyy */
export function metinToGgAayyyy(s: string | null | undefined): string {
  const t = String(s ?? '').trim()
  if (!t) return ''
  const eslesen = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/)
  if (eslesen) {
    let yil = Number(eslesen[3])
    if (yil < 100) yil += 2000
    return `${ikiHane(Number(eslesen[1]))}.${ikiHane(Number(eslesen[2]))}.${yil}`
  }
  const d = parseTarihEsnek(t)
  return d ? formatDateGgAayyyy(d) : t
}

/** Excel seri numarası (44927 vb.) → Date */
export function excelSeriToDate(n: number): Date | null {
  if (!Number.isFinite(n) || n < 1 || n > 80_000) return null
  const whole = Math.floor(n)
  const d = new Date(Date.UTC(1899, 11, 30) + whole * 86_400_000)
  if (isNaN(d.getTime())) return null
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Excel hücresi (seri no, Date veya metin) → gg.aa.yyyy */
export function hucreToGgAayyyy(v: unknown): string {
  if (v == null || v === '') return ''
  if (v instanceof Date && !isNaN(v.getTime())) return formatDateGgAayyyy(v)
  if (typeof v === 'number') {
    const d = excelSeriToDate(v)
    return d ? formatDateGgAayyyy(d) : String(v)
  }
  return metinToGgAayyyy(String(v))
}

/** gg.aa.yyyy (ve / - varyantları) → yyyy-mm-dd (ISO) */
export function ggAayyyyToIso(s: string | null | undefined): string | null {
  const t = String(s ?? '').trim()
  if (!t) return null
  const m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (m) return `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  return null
}

/** ISO veya gg.aa.yyyy formatındaki tarihi gg.aa.yyyy olarak döndürür */
export function toGgAayyyy(s: string | null | undefined): string {
  if (!s || !String(s).trim()) return ''
  return metinToGgAayyyy(s)
}

/** YYYY-MM-DD üzerine gün ekler (UTC takvim; saat dilimi kayması yok). */
export function isoTarihGunEkle(iso: string, gun: number): string | null {
  const m = String(iso ?? '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  if (isNaN(dt.getTime())) return null
  dt.setUTCDate(dt.getUTCDate() + gun)
  return dt.toISOString().slice(0, 10)
}

/** Yerel takvim bugünü (YYYY-MM-DD). */
export function isoBugunYerel(ref = new Date()): string {
  return `${ref.getFullYear()}-${ikiHane(ref.getMonth() + 1)}-${ikiHane(ref.getDate())}`
}

/** Yazarken gg.aa.yyyy maskesi (yalnızca rakam). */
export function tarihYazisiMaskele(raw: string): string {
  const d = String(raw ?? '').replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`
}
