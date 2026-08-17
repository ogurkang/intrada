/**
 * Kalıcı kullanıcı adı: yalnızca İngilizce harf (A–Z), kayıt her zaman büyük harf.
 * Türkçe klavye girişi Latin harfe indirgenir (ör. Gürkan → GURKAN).
 */

const KULLANICI_ADI_BOYUT = { min: 3, max: 32 } as const

/** Türkçe harfleri yakın Latin ASCII harfine çevir (büyük/küçük). */
function turkceyiLatinHarfe(s: string): string {
  return s
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
}

/**
 * Form / yapıştırma girdisinden yalnızca A–Z bırakır, büyük harfe çevirir.
 */
export function normalizeKullaniciAdi(raw: string): string {
  const latin = turkceyiLatinHarfe(raw.trim())
  const sadeceHarf = latin.replace(/[^a-zA-Z]/g, '')
  return sadeceHarf.toUpperCase()
}

export function kullaniciAdiGecerliMi(normalized: string): boolean {
  const { min, max } = KULLANICI_ADI_BOYUT
  if (normalized.length < min || normalized.length > max) return false
  return /^[A-Z]+$/.test(normalized)
}

export function kullaniciAdiHataMetni(): string {
  const { min, max } = KULLANICI_ADI_BOYUT
  return `Kullanıcı adı ${min}–${max} karakter olmalı; yalnızca harf (A–Z). Rakam veya özel karakter yok; yazdığınız küçük harf otomatik büyük kaydedilir.`
}

/** Supabase Auth e-posta/şifre altyapısında kullanıcı adıyla giriş için iç kimlik. */
export function disDenetciAuthEmail(kullaniciAdi: string): string {
  return `${normalizeKullaniciAdi(kullaniciAdi).toLowerCase()}@auditor.invalid`
}
