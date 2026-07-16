/**
 * Performans 1./2. amir eşlemesi (v1).
 * Kaynak: organizasyon ağacı + kadro unvan indeksi.
 */
import {
  mudurlukEslesmeBaz,
  organizasyonPersonelIndeksKur,
  type BirimTuru,
  type KadroUnvanSatir,
} from '@/lib/organizasyon-birim'
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

function mudurSicilForBaz(
  baz: string,
  indeks: ReturnType<typeof organizasyonPersonelIndeksKur>,
  kadroRows: Array<KadroUnvanSatir & { asil?: string | null; vekil?: string | null }>,
): string | null {
  // indeks sadece ad tutuyor; sicil için kadro satırını tekrar tara
  const hedef = trNormalize(baz)
  for (const r of kadroRows) {
    const unvan = trNormalize(String(r.kadro_unvani ?? r.gorev_unvani ?? ''))
    if (!unvan.includes('muduru')) continue
    if (unvan.includes('yardimci')) continue
    const idx = unvan.indexOf('muduru')
    const ubaz = unvan.slice(0, idx).trim()
    if (ubaz !== hedef && !ubaz.includes(hedef) && !hedef.includes(ubaz)) continue
    const sicil = String(r.asil ?? r.vekil ?? '').trim()
    if (sicil) return sicil
  }
  return null
}

function baskanSicil(
  birimler: OrgBirimSatir[],
  indeks: ReturnType<typeof organizasyonPersonelIndeksKur>,
  kadroRows: Array<KadroUnvanSatir & { asil?: string | null; vekil?: string | null }>,
): string | null {
  const baskanBirim = birimler.find(b => b.birim_turu === 'baskan')
  if (baskanBirim?.personel_sicil_no) return baskanBirim.personel_sicil_no
  // kadrodan "Belediye Başkanı"
  for (const r of kadroRows) {
    const unvan = String(r.kadro_unvani ?? r.gorev_unvani ?? '')
    const n = trNormalize(unvan)
    if (n.includes('belediye baskani') && !n.includes('yardimci')) {
      const sicil = String(r.asil ?? r.vekil ?? '').trim()
      if (sicil) return sicil
    }
  }
  void indeks
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
  // gevşek eşleme
  for (const b of birimler) {
    if (b.birim_turu !== 'mudurluk') continue
    const adi = mudurlukEslesmeBaz(b.mudurluk?.mudurluk_adi)
    if (adi && (adi.includes(baz) || baz.includes(adi))) return b
  }
  return null
}

/**
 * Personelin müdürlük adına ve unvanına göre 1./2. amir sicillerini çözer.
 */
export function performansAmirEsle(params: {
  sicilNo: string
  unvan: string | null | undefined
  mudurlukAdi: string | null | undefined
  birimler: OrgBirimSatir[]
  kadroRows: Array<KadroUnvanSatir & { asil?: string | null; vekil?: string | null }>
}): AmirEslemeSonucu {
  const formTipi = formTipiFromUnvan(params.unvan)
  const indeks = organizasyonPersonelIndeksKur(params.kadroRows)
  const baskan = baskanSicil(params.birimler, indeks, params.kadroRows)

  if (formTipi === 'baskan') {
    return {
      formTipi,
      amir1_sicil: params.sicilNo,
      amir2_sicil: null,
      tek_amir: true,
    }
  }

  const mudurlukBirim = findMudurlukBirim(params.birimler, params.mudurlukAdi)
  const ust = mudurlukBirim
    ? params.birimler.find(b => b.id === mudurlukBirim.ust_birim_id) ?? null
    : null

  const direkBaskanaBagli = ust?.birim_turu === 'baskan'
  const bySicil =
    ust?.birim_turu === 'baskan_yardimcisi'
      ? (ust.personel_sicil_no ?? null)
      : null

  const mudurSicil = mudurSicilForBaz(
    mudurlukEslesmeBaz(params.mudurlukAdi),
    indeks,
    params.kadroRows,
  )

  // Müdür / yönetici
  if (formTipi === 'yonetici') {
    // kendisi müdür: 1=BY (veya başkan), 2=başkan
    if (direkBaskanaBagli) {
      return {
        formTipi,
        amir1_sicil: baskan,
        amir2_sicil: baskan,
        tek_amir: false,
      }
    }
    return {
      formTipi,
      amir1_sicil: bySicil ?? baskan,
      amir2_sicil: baskan,
      tek_amir: false,
    }
  }

  // Memur / şef
  if (direkBaskanaBagli) {
    return {
      formTipi,
      amir1_sicil: mudurSicil,
      amir2_sicil: baskan,
      tek_amir: false,
    }
  }

  return {
    formTipi,
    amir1_sicil: mudurSicil,
    amir2_sicil: bySicil ?? baskan,
    tek_amir: false,
  }
}
