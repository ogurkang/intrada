'use server'

import { katilimciKaydet } from '../[donem_id]/actions'

export async function istatistikKatilimKaydet(
  egitim_id: number,
  donem_id: number,
  sicilNolar: string[],
  mudurlukMap: Record<string, string>
): Promise<{ hata?: string }> {
  return katilimciKaydet(egitim_id, donem_id, sicilNolar, mudurlukMap)
}
