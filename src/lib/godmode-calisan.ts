/**
 * Sistem / “godmode” hesapları — personel ve yetkilendirme listelerinde gösterilmez.
 *
 * Ortam: APP_GODMODE_SICIL_LIST=IK001,IK002
 * (virgülle ayırın; sicil_no veritabanındaki yazım ile aynı olmalı, örn. büyük harf)
 */

export function godmodeSicilSet(): Set<string> {
  const raw = process.env.APP_GODMODE_SICIL_LIST ?? ''
  const set = new Set<string>(['IK001'])
  for (const s of raw.split(',')) {
    const t = s.trim()
    if (t) set.add(t)
  }
  return set
}

/** Sicilden bağımsız gizli sistem kullanıcıları (e-posta bazlı). */
export function hiddenSystemEmailSet(): Set<string> {
  return new Set(['insankaynaklari@adapazari.bel.tr'])
}

export function isHiddenSystemEmail(email: string | null | undefined): boolean {
  const e = String(email ?? '').trim().toLocaleLowerCase('tr-TR')
  if (!e) return false
  return hiddenSystemEmailSet().has(e)
}

export function filterOutGodmodeCalisan<T extends { sicil_no: string }>(rows: T[]): T[] {
  const hide = godmodeSicilSet()
  if (hide.size === 0) return rows
  return rows.filter(r => !hide.has(r.sicil_no))
}

/** E-posta alanı içeren listelerde sistem kullanıcılarını gizler. */
export function filterOutHiddenSystemByEmail<T extends { e_posta?: string | null }>(rows: T[]): T[] {
  return rows.filter(r => !isHiddenSystemEmail(r.e_posta))
}

/** Sicil string listesi için (ör. ayrılanlar sicil listesi) */
export function filterOutGodmodeSicilList(siciller: string[]): string[] {
  const hide = godmodeSicilSet()
  if (hide.size === 0) return siciller
  return siciller.filter(s => !hide.has(s))
}
