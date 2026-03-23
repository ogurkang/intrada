/** Canonical kadro detay: `/link/{public_id}` (UUID). */

const UUID_SEGMENT_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function kadroDetayHref(k: { id: number; public_id?: string | null }): string {
  const pid = k.public_id?.trim()
  if (pid && UUID_SEGMENT_RE.test(pid)) return `/link/${pid}`
  return `/kadro/${k.id}`
}
