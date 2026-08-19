/**
 * Performans 1./2. amir eşlemesi.
 * Kaynak: Tanımlar → Organizasyon ağacı + kadro unvan indeksi.
 *
 * Tek amir (yalnızca 1. amir değerlendirir):
 * - Belediye Başkanı
 * - Organizasyonda başkan yardımcısı birimine atanmış personel (memur statülü BY)
 * - Başkana doğrudan bağlı müdürlüğün müdürü
 *
 * İki amir (1. amir + 2. amir):
 * - Müdürlük memur/şef: müdür → (BY veya başkan, müdürlüğün üst birimine göre)
 * - BY altındaki müdürlük müdürü: BY → başkan
 */
import {
  mudurlukBazEslesir,
  mudurlukEslesmeBaz,
  organizasyonPersonelIndeksKur,
  unvanMudurEslesmeBaz,
  type BirimTuru,
  type KadroUnvanSatir,
} from '@/lib/organizasyon-birim'
import {
  kadroGorevUnvani,
  performansMudurUnvaniMi,
} from '@/lib/performans-unvan'
import { trNormalize } from '@/lib/turkce-search'
import { formTipiFromUnvan, type PerformansFormTipi } from '@/lib/performans'

export interface OrgBirimSatir {
  id: number
  birim_turu: BirimTuru
  mudurluk_id: number | null
  personel_sicil_no: string | null
  ust_birim_id: number | null
  mudurluk?: { id: number; mudurluk_adi: string | null } | null
}

export interface AmirEslemeSonucu {
  formTipi: PerformansFormTipi
  amir1_sicil: string | null
  amir2_sicil: string | null
  tek_amir: boolean
}

function amirSonuc(
  formTipi: PerformansFormTipi,
  amir1: string | null,
  amir2: string | null,
  tek_amir: boolean,
): AmirEslemeSonucu {
  return {
    formTipi,
    amir1_sicil: amir1?.trim() || null,
    amir2_sicil: tek_amir ? null : (amir2?.trim() || null),
    tek_amir,
  }
}

export function mudurSicilForBaz(
  baz: string,
  kadroRows: Array<KadroUnvanSatir & { asil?: string | null; vekil?: string | null }>,
): string | null {
  const hedef = baz.trim()
  if (!hedef) return null
  for (const r of kadroRows) {
    const u = String(r.kadro_unvani ?? '').trim() || String(r.gorev_unvani ?? '').trim()
    if (!u || !performansMudurUnvaniMi(u)) continue
    const unvanBaz = unvanMudurEslesmeBaz(u)
    const mudBaz = mudurlukEslesmeBaz(r.kadro_mudurlugu) || mudurlukEslesmeBaz(r.gorev_mudurlugu)
    if (!mudurlukBazEslesir(hedef, unvanBaz) && !mudurlukBazEslesir(hedef, mudBaz)) continue
    const vekil = String(r.vekil ?? '').trim()
    const asil = String(r.asil ?? '').trim()
    const sicil = vekil || asil
    if (sicil) return sicil
  }
  return null
}

/** Organizasyon / kadro üzerinden belediye başkanı sicil_no. */
export function baskanSicilBul(
  birimler: OrgBirimSatir[],
  kadroRows: Array<KadroUnvanSatir & { asil?: string | null; vekil?: string | null }>,
): string | null {
  const baskanBirim = birimler.find(b => b.birim_turu === 'baskan')
  if (baskanBirim?.personel_sicil_no) return baskanBirim.personel_sicil_no
  for (const r of kadroRows) {
    const unvan = String(r.kadro_unvani ?? r.gorev_unvani ?? '')
    const n = trNormalize(unvan)
    if (n.includes('belediye baskani') && !n.includes('yardimci')) {
      const sicil = String(r.asil ?? r.vekil ?? '').trim()
      if (sicil) return sicil
    }
  }
  return null
}

function findMudurlukBirim(
  birimler: OrgBirimSatir[],
  mudurlukAdi: string | null | undefined,
): OrgBirimSatir | null {
  const baz = mudurlukEslesmeBaz(mudurlukAdi)
  if (!baz) return null
  for (const b of birimler) {
    if (b.birim_turu !== 'mudurluk') continue
    const adi = b.mudurluk?.mudurluk_adi ?? ''
    if (mudurlukEslesmeBaz(adi) === baz) return b
  }
  for (const b of birimler) {
    if (b.birim_turu !== 'mudurluk') continue
    const adi = mudurlukEslesmeBaz(b.mudurluk?.mudurluk_adi)
    if (adi && (adi.includes(baz) || baz.includes(adi))) return b
  }
  return null
}

/** Organizasyon ağacında başkan yardımcısı birimine atanmış mı? */
export function baskanYardimcisiBirimindeMi(
  sicilNo: string,
  birimler: OrgBirimSatir[],
): boolean {
  const hedef = sicilNo.trim()
  if (!hedef) return false
  return birimler.some(
    b => b.birim_turu === 'baskan_yardimcisi' && b.personel_sicil_no === hedef,
  )
}

/**
 * Personelin müdürlük adına ve organizasyon ağacına göre 1./2. amir sicillerini çözer.
 */
export function performansAmirEsle(params: {
  sicilNo: string
  unvan: string | null | undefined
  mudurlukAdi: string | null | undefined
  birimler: OrgBirimSatir[]
  kadroRows: Array<KadroUnvanSatir & { asil?: string | null; vekil?: string | null }>
}): AmirEslemeSonucu {
  const formTipi = formTipiFromUnvan(params.unvan)
  void organizasyonPersonelIndeksKur(params.kadroRows)
  const baskan = baskanSicilBul(params.birimler, params.kadroRows)

  if (formTipi === 'baskan') {
    return amirSonuc(formTipi, params.sicilNo, null, true)
  }

  if (baskanYardimcisiBirimindeMi(params.sicilNo, params.birimler)) {
    return amirSonuc(formTipi, baskan, null, true)
  }

  const mudurlukBirim = findMudurlukBirim(params.birimler, params.mudurlukAdi)
  const ust = mudurlukBirim
    ? params.birimler.find(b => b.id === mudurlukBirim.ust_birim_id) ?? null
    : null

  const direkBaskanaBagli = ust?.birim_turu === 'baskan'
  const bySicil =
    ust?.birim_turu === 'baskan_yardimcisi' ? (ust.personel_sicil_no ?? null) : null

  const mudurSicil = mudurSicilForBaz(
    mudurlukEslesmeBaz(params.mudurlukAdi),
    params.kadroRows,
  )

  if (formTipi === 'yonetici') {
    if (direkBaskanaBagli) {
      return amirSonuc(formTipi, baskan, null, true)
    }
    return amirSonuc(formTipi, bySicil ?? baskan, baskan, false)
  }

  if (direkBaskanaBagli) {
    return amirSonuc(formTipi, mudurSicil, baskan, false)
  }

  return amirSonuc(formTipi, mudurSicil, bySicil ?? baskan, false)
}
