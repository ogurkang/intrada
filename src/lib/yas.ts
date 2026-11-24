import { thHizmetBilesen, thHizmetSuresiEtiket, thHizmetTamYil } from '@/lib/th-hizmet-yili'

/**
 * Doğum tarihinden bugüne (veya referansa) takvim yılı / ay / gün.
 * Teknik hizmet süresi ile aynı dinamik hesap.
 */
export function yasBilesen(
  dogumTarihi: string | null | undefined,
  referans?: string | Date | null,
) {
  return thHizmetBilesen(dogumTarihi, referans)
}

/** Örn. «42 yıl 3 ay 12 gün» — doğum tarihi yoksa null. */
export function yasEtiket(
  dogumTarihi: string | null | undefined,
  referans?: string | Date | null,
): string | null {
  return thHizmetSuresiEtiket(dogumTarihi, referans)
}

/** Tamamlanan yaş yılı (null = tarih yok). */
export function yasTamYil(
  dogumTarihi: string | null | undefined,
  referans?: string | Date | null,
): number | null {
  return thHizmetTamYil(dogumTarihi, referans)
}

/** 6 yaşından küçük mü? (tam yıl < 6). Tarih yoksa false. */
export function altiYasindanKucukMu(
  dogumTarihi: string | null | undefined,
  referans?: string | Date | null,
): boolean {
  const y = yasTamYil(dogumTarihi, referans)
  return y != null && y < 6
}
