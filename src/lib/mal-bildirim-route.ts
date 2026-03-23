/**
 * Mal bildirimi sayfa/API parametresi: UUID (public_id) veya geçiş dönemi için sayısal id.
 * Yeni kayıtlar ve listeler UUID kullanır; sıralı sayı adres çubuğunda görünmez.
 * (Güvenlik: UUID tek başına yetkilendirme değildir; sunucuda sicil/rol kontrolü şart.)
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isMalBildirimPublicId(s: string): boolean {
  return UUID_RE.test(s.trim())
}

export function parseMalBildirimRouteParam(raw: string):
  | { ok: true; by: 'public_id'; public_id: string }
  | { ok: true; by: 'id'; id: number }
  | { ok: false } {
  const t = raw.trim()
  if (UUID_RE.test(t)) return { ok: true, by: 'public_id', public_id: t }
  if (/^\d+$/.test(t)) {
    const id = parseInt(t, 10)
    if (id > 0) return { ok: true, by: 'id', id }
  }
  return { ok: false }
}

/** Link ve yönlendirme: tercih public_id (UUID). */
export function malBildirimUrlSegment(k: { public_id?: string | null; id: number }): string {
  if (k.public_id && isMalBildirimPublicId(k.public_id)) return k.public_id
  return String(k.id)
}

/** Uygulama içi detay (kullanıcı rolü `/link` modülü kapalı olduğundan `/bildirim/mal/...` kullanılır). */
export function malBildirimDetayHref(k: { public_id?: string | null; id: number }): string {
  return `/bildirim/mal/${malBildirimUrlSegment(k)}`
}

/**
 * Personel kartından açılış: detay salt okunur (düzenleme bildirim modülünden).
 * @see `bildirim/mal/[id]/page.tsx` — `salt=1` + kullanıcı + kendi sicili
 */
export function malBildirimDetayHrefPersonelSaltOkunur(k: { public_id?: string | null; id: number }): string {
  return `${malBildirimDetayHref(k)}?salt=1`
}
