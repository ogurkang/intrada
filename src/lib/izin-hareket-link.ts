const UUID_SEGMENT_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Canonical izin detay: `/link/{public_id}` */
export function izinHareketDetayHref(h: { id: number; public_id?: string | null }, search?: { yil?: number }): string {
  const pid = h.public_id?.trim()
  const base =
    pid && UUID_SEGMENT_RE.test(pid) ? `/link/${pid}` : `/izin/${h.id}`
  const qs =
    search?.yil != null && !pid ? `?yil=${encodeURIComponent(String(search.yil))}` : ''
  return base + qs
}
