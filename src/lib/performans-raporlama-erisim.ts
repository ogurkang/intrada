/**
 * Raporlama ekranında müdür / BBY / başkan kapsamı — değerlendirme ile aynı kurallar.
 * Sonuç tek düz listede gösterilir (kendisi hariç).
 */

import type { OrgBirimSatir } from '@/lib/performans-amir'
import {
  performansAmirErisimOlustur,
  performansAmirSatirGorulebilir,
  performansBaskanDogrudanSatirlari,
  performansBaskanLandingMi,
  performansBaskanPersonelSatirlari,
  performansBbyAmir1LandingMi,
  performansBbyAmir1MudurSatirlari,
  performansBbyAmir2LandingMi,
  performansBbyAmir2PersonelSatirlari,
  performansMudurLandingMi,
  type PerformansAmirErisim,
} from '@/lib/performans-amir-erisim'
import { performansSicilEsit } from '@/lib/performans-kadro'
import {
  performansBelediyeBaskaniUnvaniMi,
  performansBaskanYardimcisiUnvaniMi,
  performansMudurUnvaniMi,
} from '@/lib/performans-unvan'

export type PerformansRaporlamaDegSatir = {
  id: number
  sicil_no: string
  mudurluk_adi: string | null
  durum: string
  tek_amir?: boolean
  puan_amir1: number | null
  puan_amir2: number | null
  ortalama: number | null
  amir1_sicil: string | null
  amir2_sicil: string | null
  kadro_mudurlugu?: string | null
}

function benzersizSicil<T extends { sicil_no: string }>(liste: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const r of liste) {
    if (seen.has(r.sicil_no)) continue
    seen.add(r.sicil_no)
    out.push(r)
  }
  return out
}

/** Müdür: kendisi hariç, 1. amir olduğu memur/şef personel */
function mudurRaporSatirlari<T extends PerformansRaporlamaDegSatir>(
  hedef: string,
  filtreli: T[],
  etkinUnvanMap: Map<string, string | null | undefined>,
): T[] {
  return filtreli.filter(r => {
    if (!performansSicilEsit(r.amir1_sicil, hedef)) return false
    const unvan = etkinUnvanMap.get(r.sicil_no) ?? ''
    if (performansMudurUnvaniMi(unvan)) return false
    if (performansBelediyeBaskaniUnvaniMi(unvan)) return false
    if (performansBaskanYardimcisiUnvaniMi(unvan)) return false
    return true
  })
}

/**
 * Oturum sahibinin raporlayabileceği tamamlanmış değerlendirme satırları.
 * Admin bypass: tüm satırlar (kendisi filtrelenmez).
 */
export function performansRaporlamaSatirlariSec<T extends PerformansRaporlamaDegSatir>(
  currentSicil: string,
  birimler: OrgBirimSatir[],
  kadroRows: Array<{
    asil?: string | null
    vekil?: string | null
    kadro_unvani?: string | null
    gorev_unvani?: string | null
    kadro_mudurlugu?: string | null
    gorev_mudurlugu?: string | null
  }>,
  etkinUnvanMap: Map<string, string | null | undefined>,
  tamamlananListe: T[],
  degAtamalari: Array<{
    mudurluk_adi?: string | null
    amir1_sicil?: string | null
    amir2_sicil?: string | null
  }>,
  adminBypass: boolean,
): { satirlar: T[]; erisim: PerformansAmirErisim | null } {
  if (adminBypass) {
    return { satirlar: tamamlananListe, erisim: null }
  }

  const hedef = currentSicil.trim()
  if (!hedef) return { satirlar: [], erisim: null }

  const amirErisim = performansAmirErisimOlustur(
    hedef,
    birimler,
    kadroRows,
    degAtamalari,
  )

  if (!amirErisim.amir1Yetkisi && !amirErisim.amir2Yetkisi) {
    return { satirlar: [], erisim: amirErisim }
  }

  const filtreli = tamamlananListe.filter(r =>
    performansAmirSatirGorulebilir(r, hedef, amirErisim),
  )

  const baskan = performansBaskanLandingMi(hedef, birimler, kadroRows, filtreli)
  const bby1 = performansBbyAmir1LandingMi(
    hedef,
    birimler,
    filtreli,
    etkinUnvanMap,
    amirErisim,
  )
  const bby2 = performansBbyAmir2LandingMi(
    hedef,
    birimler,
    filtreli,
    etkinUnvanMap,
    amirErisim,
  )
  const mudur = performansMudurLandingMi(
    hedef,
    birimler,
    kadroRows,
    filtreli,
    etkinUnvanMap,
    amirErisim,
  )

  let visible: T[]

  if (baskan) {
    visible = benzersizSicil([
      ...performansBaskanDogrudanSatirlari(hedef, birimler, filtreli, etkinUnvanMap),
      ...performansBaskanPersonelSatirlari(hedef, filtreli, etkinUnvanMap, birimler),
    ])
  } else if (bby1 && bby2) {
    visible = benzersizSicil([
      ...performansBbyAmir1MudurSatirlari(hedef, filtreli, etkinUnvanMap),
      ...performansBbyAmir2PersonelSatirlari(hedef, filtreli, etkinUnvanMap),
    ])
  } else if (bby1) {
    visible = performansBbyAmir1MudurSatirlari(hedef, filtreli, etkinUnvanMap)
  } else if (bby2) {
    visible = performansBbyAmir2PersonelSatirlari(hedef, filtreli, etkinUnvanMap)
  } else if (mudur) {
    visible = mudurRaporSatirlari(hedef, filtreli, etkinUnvanMap)
  } else {
    visible = filtreli
  }

  visible = visible.filter(r => !performansSicilEsit(r.sicil_no, hedef))

  return { satirlar: visible, erisim: amirErisim }
}

export function performansRaporlamaErisimiVar(
  erisim: PerformansAmirErisim | null,
  adminBypass: boolean,
): boolean {
  if (adminBypass) return true
  if (!erisim) return false
  return erisim.amir1Yetkisi || erisim.amir2Yetkisi
}
