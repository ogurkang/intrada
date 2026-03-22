/** Türkçe para: binlik `.`, ondalık `,` — örn. 12.456,78 */

export function parseTrMoneyDisplay(s: string): number {
  const t = String(s ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : 0
}

export function formatTrMoneyDisplay(n: number): string {
  if (!Number.isFinite(n)) return ''
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
}

/** Input sırasında: rakam, binlik nokta, ondalık virgül (blur’da normalize edilir) */
export function sanitizeTrMoneyTyping(raw: string): string {
  let s = raw.replace(/[^\d.,]/g, '')
  const parts = s.split(',')
  if (parts.length > 2) s = parts[0] + ',' + parts.slice(1).join('')
  return s
}
