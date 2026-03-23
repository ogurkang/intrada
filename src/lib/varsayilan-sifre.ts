/**
 * İlk giriş varsayılan şifre: TCKN ilk 3 hane + nokta + doğum yılı (4 hane)
 * Örnek: TCKN 12345678901 → 123.1990 (doğum 1990)
 */

function dogumYiliAl(dogumTarihi: string | null | undefined): number | null {
  if (!dogumTarihi?.trim()) return null
  const s = dogumTarihi.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const y = new Date(s).getFullYear()
    return Number.isFinite(y) ? y : null
  }
  const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})/.exec(s)
  if (m) return parseInt(m[3], 10)
  const m2 = /^(\d{4})/.exec(s)
  if (m2) return parseInt(m2[1], 10)
  return null
}

export function varsayilanSifreFromCalisan(
  tckn: string | null | undefined,
  dogumTarihi: string | null | undefined,
): string | null {
  if (!tckn) return null
  const digits = String(tckn).replace(/\D/g, '')
  if (digits.length < 3) return null
  const ilk3 = digits.slice(0, 3)
  const yil = dogumYiliAl(dogumTarihi ?? null)
  if (yil == null || yil < 1900 || yil > 2100) return null
  return `${ilk3}.${yil}`
}
