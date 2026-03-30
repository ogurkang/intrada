/**
 * Dönem [baslangic, bitis] için bir önceki ayın aynı gün sınırlarında terfi tarihi penceresi.
 * Örnek: 15.03–14.04 → 15.02–14.03 (tarih string YYYY-MM-DD).
 */
export function terfiTarihPenceresiOncekiDonem(
  baslangicISO: string,
  bitisISO: string,
): { bas: string; bit: string } {
  const b1 = new Date(baslangicISO.slice(0, 10) + 'T12:00:00')
  const b2 = new Date(bitisISO.slice(0, 10) + 'T12:00:00')
  if (Number.isNaN(b1.getTime()) || Number.isNaN(b2.getTime())) {
    return { bas: baslangicISO.slice(0, 10), bit: bitisISO.slice(0, 10) }
  }
  const m1 = new Date(b1)
  m1.setMonth(m1.getMonth() - 1)
  const m2 = new Date(b2)
  m2.setMonth(m2.getMonth() - 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  const iso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return { bas: iso(m1), bit: iso(m2) }
}

/** Tarih dahil aralıkta mı (YYYY-MM-DD). */
export function tarihDahilAralikta(t: string | null | undefined, lo: string, hi: string): boolean {
  if (t == null || !String(t).trim()) return false
  const x = String(t).slice(0, 10)
  return x >= lo && x <= hi
}

export function tarihGun(t: string | null | undefined): string {
  if (t == null || !String(t).trim()) return ''
  return String(t).slice(0, 10)
}
