/** Personel hareketi benzersiz işlem numarası: PH#123 */
export function personelHareketIslemNo(
  hareketId: number | null | undefined,
  kayitNo?: string | null,
): string {
  const id = Number(hareketId ?? 0)
  if (Number.isFinite(id) && id > 0) return `PH#${id}`
  const kn = String(kayitNo ?? '').trim()
  const m = kn.match(/^PH#(\d+)$/i)
  if (m) return `PH#${m[1]}`
  return '—'
}

export function personelHareketIslemNoUret(hareketId: number): string {
  return `PH#${hareketId}`
}
