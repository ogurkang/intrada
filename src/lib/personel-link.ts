/** Canonical personel detay: `/link/{public_id}` (UUID). */

const UUID_SEGMENT_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuidSegment(s: string): boolean {
  return UUID_SEGMENT_RE.test(s.trim())
}

/**
 * Liste / pano linkleri için: `public_id` varsa `/link/...`, yoksa eski `/personel/{sicil}`.
 */
export function personelDetayHref(
  p: { sicil_no: string; public_id?: string | null },
  search?: { kaynak?: string; sekme?: string },
): string {
  const pid = p.public_id?.trim()
  const base =
    pid && UUID_SEGMENT_RE.test(pid) ? `/link/${pid}` : `/personel/${encodeURIComponent(p.sicil_no)}`
  const qs = new URLSearchParams()
  if (search?.kaynak) qs.set('kaynak', search.kaynak)
  if (search?.sekme) qs.set('sekme', search.sekme)
  const q = qs.toString()
  return q ? `${base}?${q}` : base
}
