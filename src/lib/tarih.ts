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

/** gg.aa.yyyy formatını yyyy-mm-dd (ISO) formatına çevirir */
export function ggAayyyyToIso(s: string | null | undefined): string | null {
  if (!s || !String(s).trim()) return null
  const t = String(s).trim()
  const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!m) return t.includes('-') ? t : null
  const [, g, a, y] = m
  return `${y}-${a!.padStart(2, '0')}-${g!.padStart(2, '0')}`
}

/** ISO veya gg.aa.yyyy formatındaki tarihi gg.aa.yyyy olarak döndürür */
export function toGgAayyyy(s: string | null | undefined): string {
  if (!s || !String(s).trim()) return ''
  const t = String(s).trim()
  if (t.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) return t
  const d = new Date(t)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('tr-TR')
}
