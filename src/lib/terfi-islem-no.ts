/** Terfi kaydı referans numarası: T#123 (terfi_hareketleri.id) */
export function terfiIslemNo(terfiId: number | null | undefined): string {
  const id = Number(terfiId ?? 0)
  if (Number.isFinite(id) && id > 0) return `T#${id}`
  return '—'
}
