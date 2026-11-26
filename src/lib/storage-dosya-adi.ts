/**
 * Supabase Storage object key yalnızca ASCII harf/rakam ve _ - . kabul eder.
 * Türkçe karakterli / boşluklu dosya adları Invalid key hatası verir.
 * Asıl görünen ad ayrı alanda (ör. ek_ad) tutulur; burada yalnızca depolama yolu güvenli hale getirilir.
 */

const TURKCE_LATIN: Record<string, string> = {
  ç: 'c',
  Ç: 'C',
  ğ: 'g',
  Ğ: 'G',
  ı: 'i',
  İ: 'I',
  ö: 'o',
  Ö: 'O',
  ş: 's',
  Ş: 'S',
  ü: 'u',
  Ü: 'U',
}

/** Depolama anahtarı için dosya adını ASCII-güvenli yapar; uzantıyı korur. */
export function storageDosyaAdiGuvenli(dosyaAdi: string, yedek = 'ek'): string {
  const ham = String(dosyaAdi || '').trim() || yedek
  const sonNokta = ham.lastIndexOf('.')
  const govdeHam = sonNokta > 0 ? ham.slice(0, sonNokta) : ham
  const uzantiHam = sonNokta > 0 ? ham.slice(sonNokta + 1) : ''

  const govde = govdeHam
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, c => TURKCE_LATIN[c] ?? c)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 100)

  const uzanti = uzantiHam
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, c => TURKCE_LATIN[c] ?? c)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .slice(0, 20)
    .toLowerCase()

  const ad = govde || yedek
  return uzanti ? `${ad}.${uzanti}` : ad
}
