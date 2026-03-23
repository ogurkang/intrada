import { isUuidSegment } from '@/lib/personel-link'

/** Canonical firma personel detay: `/link/{public_id}`. */
export function firmaCalisanDetayHref(p: { id: number; public_id?: string | null }): string {
  const pid = p.public_id?.trim()
  if (pid && isUuidSegment(pid)) return `/link/${pid}`
  return `/firma-calisanlar/${p.id}`
}
