/** Kadro satırı: asil → Dolu, yalnız vekil → Vekil, ikisi boş → Boş */
export type KadroDurumuTipi = 'Dolu' | 'Vekil' | 'Boş'

export function kadroDurumuHesapla(
  asil: string | null | undefined,
  vekil: string | null | undefined,
): KadroDurumuTipi {
  const a = (asil ?? '').trim()
  const v = (vekil ?? '').trim()
  if (a) return 'Dolu'
  if (v) return 'Vekil'
  return 'Boş'
}

/** Personel hareketleri kadro seçimi: statü Memur ve durumu Boş. */
export function kadroPersonelHareketSecilebilirMi(k: {
  statu?: string | null
  durumu?: string | null
}): boolean {
  return String(k.statu ?? '').trim() === 'Memur' && String(k.durumu ?? '').trim() === 'Boş'
}
