export type SonAyrilisOzet = {
  ayrilis_tarihi: string | null
  ayrilis_nedeni: string | null
}

/** Ayrılış tarihi ve nedeni birlikte doluysa personel pasif sayılır. */
export function personelPasifMi(
  ozet: SonAyrilisOzet | null | undefined,
  refTarih?: string,
): boolean {
  const tarih = String(ozet?.ayrilis_tarihi ?? '').trim()
  const nedeni = String(ozet?.ayrilis_nedeni ?? '').trim()
  if (!tarih || !nedeni) return false
  if (refTarih && tarih > refTarih) return false
  return true
}

export function personelAktifMi(
  ozet: SonAyrilisOzet | null | undefined,
  refTarih?: string,
): boolean {
  return !personelPasifMi(ozet, refTarih)
}

/** İkisi birlikte dolu veya ikisi de boş olmalı. */
export function dogrulaAyrilisAlanlari(
  tarih: string | null | undefined,
  nedeni: string | null | undefined,
): string | null {
  const t = String(tarih ?? '').trim()
  const n = String(nedeni ?? '').trim()
  if (t && !n) return 'Ayrılış nedeni seçilmelidir.'
  if (n && !t) return 'Ayrılış tarihi girilmelidir.'
  return null
}

export function sonAyrilisHaritasiOlustur<
  T extends { sicil_no: string; ayrilis_tarihi: string | null; ayrilis_nedeni?: string | null },
>(rows: T[]): Map<string, SonAyrilisOzet> {
  const map = new Map<string, SonAyrilisOzet>()
  for (const r of rows) {
    if (!map.has(r.sicil_no)) {
      map.set(r.sicil_no, {
        ayrilis_tarihi: r.ayrilis_tarihi,
        ayrilis_nedeni: r.ayrilis_nedeni ?? null,
      })
    }
  }
  return map
}
