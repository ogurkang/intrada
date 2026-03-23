const UUID_SEGMENT_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Canonical: `/link/{public_id}` — kayıt düzenleme */
export function personelHareketDuzenleHref(h: { id: number; public_id?: string | null }): string {
  const pid = h.public_id?.trim()
  if (pid && UUID_SEGMENT_RE.test(pid)) return `/link/${pid}`
  return `/personel-hareketleri/${h.id}/duzenle`
}
