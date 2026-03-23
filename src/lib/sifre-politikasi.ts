/**
 * Yeni şifre: en fazla 6 karakter; yalnızca Latin harf (A–Z, a–z) ve rakam (0–9).
 * Özel karakter, boşluk veya Türkçe harf yok (Türkçe klavye ile yazılan ı, ş vb. kabul edilmez).
 */
export const SIFRE_MIN_UZUNLUK = 1
export const SIFRE_MAX_UZUNLUK = 6

/** Sadece ASCII harf + rakam, uzunluk min–max (trim sonrası) */
const SIFRE_REGEX = /^[A-Za-z0-9]+$/

export function yeniSifreNormalize(sifre: string): string {
  return String(sifre ?? '').trim()
}

export function yeniSifreGecerliMi(sifre: string): boolean {
  const t = yeniSifreNormalize(sifre)
  if (t.length < SIFRE_MIN_UZUNLUK || t.length > SIFRE_MAX_UZUNLUK) return false
  return SIFRE_REGEX.test(t)
}

export function yeniSifreHataMetni(): string {
  return `Şifre ${SIFRE_MIN_UZUNLUK}–${SIFRE_MAX_UZUNLUK} karakter olmalı; yalnızca harf (A–Z, a–z) ve rakam (0–9). Boşluk ve özel karakter kullanılamaz.`
}
