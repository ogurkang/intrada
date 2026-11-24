import { thHizmetBilesen, thHizmetSuresiEtiket } from '@/lib/th-hizmet-yili'

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
