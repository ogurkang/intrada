/**
 * Performans değerlendirme ekranında müdür / başkan yardımcısı erişim kapsamı.
 * Organizasyon ağacı + dönemdeki amir atamaları birlikte kullanılır.
 */
import { mudurlukEslesmeBaz } from '@/lib/organizasyon-birim'
import type { OrgBirimSatir } from '@/lib/performans-amir'
import { performansMudurlukEslesir } from '@/lib/performans-kadro'
import { trNormalize } from '@/lib/turkce-search'

export interface PerformansAmirErisim {
  sicilNo: string
  amir1Mudurlukler: string[]
  amir2Mudurlukler: string[]
  gorulebilirMudurlukler: string[]
  amir1Yetkisi: boolean
  amir2Yetkisi: boolean
}

type KadroSatir = {
  asil?: string | null
  vekil?: string | null
  kadro_unvani?: string | null
  gorev_unvani?: string | null
}

function mudurSicilForBaz(baz: string, kadroRows: KadroSatir[]): string | null {
  const hedef = trNormalize(baz)
  if (!hedef) return null
  for (const r of kadroRows) {
    const unvan = trNormalize(String(r.kadro_unvani ?? r.gorev_unvani ?? ''))
    if (!unvan.includes('muduru') || unvan.includes('yardimci')) continue
    const idx = unvan.indexOf('muduru')
    const ubaz = unvan.slice(0, idx).trim()
    if (ubaz !== hedef && !ubaz.includes(hedef) && !hedef.includes(ubaz)) continue
    const sicil = String(r.asil ?? r.vekil ?? '').trim()
    if (sicil) return sicil
  }
  return null
}

/** Organizasyon ağacından müdür / BY kapsamındaki müdürlükleri bulur. */
export function performansOrgMudurlukleri(
  sicilNo: string,
  birimler: OrgBirimSatir[],
  kadroRows: KadroSatir[],
): { amir1: string[]; amir2: string[] } {
  const hedef = sicilNo.trim()
  const amir1 = new Set<string>()
  const amir2 = new Set<string>()

  const byBirim = birimler.find(
    b => b.birim_turu === 'baskan_yardimcisi' && b.personel_sicil_no === hedef,
  )
  if (byBirim) {
    for (const b of birimler) {
      if (b.birim_turu !== 'mudurluk' || b.ust_birim_id !== byBirim.id) continue
      const adi = b.mudurluk?.mudurluk_adi?.trim()
      if (adi) amir2.add(adi)
    }
  }

  for (const b of birimler) {
    if (b.birim_turu !== 'mudurluk') continue
    const adi = b.mudurluk?.mudurluk_adi?.trim()
    if (!adi) continue
    const mudurSicil = mudurSicilForBaz(mudurlukEslesmeBaz(adi), kadroRows)
    if (mudurSicil === hedef) amir1.add(adi)
  }

  return { amir1: [...amir1], amir2: [...amir2] }
}

export function performansAmirErisimOlustur(
  sicilNo: string,
  birimler: OrgBirimSatir[],
  kadroRows: KadroSatir[],
  degAtamalari: Array<{
    mudurluk_adi?: string | null
    amir1_sicil?: string | null
    amir2_sicil?: string | null
  }>,
): PerformansAmirErisim {
  const hedef = sicilNo.trim()
  const org = performansOrgMudurlukleri(hedef, birimler, kadroRows)
  const amir1 = new Set(org.amir1)
  const amir2 = new Set(org.amir2)

  for (const r of degAtamalari) {
    const mud = r.mudurluk_adi?.trim()
    if (!mud) continue
    if (r.amir1_sicil === hedef) amir1.add(mud)
    if (r.amir2_sicil === hedef) amir2.add(mud)
  }

  const gorulebilir = new Set([...amir1, ...amir2])
  const amir1Kayit = degAtamalari.some(r => r.amir1_sicil === hedef)
  const amir2Kayit = degAtamalari.some(r => r.amir2_sicil === hedef)

  return {
    sicilNo: hedef,
    amir1Mudurlukler: [...amir1],
    amir2Mudurlukler: [...amir2],
    gorulebilirMudurlukler: [...gorulebilir],
    amir1Yetkisi: amir1.size > 0 || amir1Kayit,
    amir2Yetkisi: amir2.size > 0 || amir2Kayit,
  }
}

export function performansMudurlukErisimiVar(
  mudurlukAdi: string,
  erisim: PerformansAmirErisim,
): boolean {
  return erisim.gorulebilirMudurlukler.some(m =>
    performansMudurlukEslesir(mudurlukAdi, { mudurluk_adi: m }),
  )
}

export function performansMudurlukListesiFiltrele(
  mudurlukAdlari: string[],
  erisim: PerformansAmirErisim,
): string[] {
  return mudurlukAdlari.filter(m => performansMudurlukErisimiVar(m, erisim))
}
