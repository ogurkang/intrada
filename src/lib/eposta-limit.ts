/** Ek, denetim belgesi gibi tarayıcıdan Storage'a gider. Sunucu gövde sınırı aradan çıkar. */
export const EPOSTA_EK_LIMIT_BAYT = 20 * 1024 * 1024

export const EPOSTA_EK_LIMIT_YAZI = '20 MB'

export function epostaBoyutYazi(bayt: number): string {
  if (bayt < 1024) return `${bayt} B`
  if (bayt < 1024 * 1024) return `${Math.max(1, Math.round(bayt / 1024))} KB`
  const mb = bayt / (1024 * 1024)
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`
}
