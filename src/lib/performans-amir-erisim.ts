/**

 * Performans değerlendirme ekranında müdür / başkan yardımcısı / belediye başkanı erişim kapsamı.

 * Organizasyon ağacı + dönemdeki amir atamaları + görev unvanı (müdürü) birlikte kullanılır.

 *

 * Yönetmelik özeti:

 * - Başkana doğrudan müdürlükler + memur statülü başkan yardımcısı → başkan tek amir (1.)

 * - Başkan yardımcısına bağlı müdürlüklerde müdür → BY 1. amir, başkan 2. amir

 * - Başkana bağlı müdürlükte memur/şef → müdür 1., başkan 2.

 */

import { mudurlukEslesmeBaz } from '@/lib/organizasyon-birim'

import { baskanSicilBul, mudurSicilForBaz, type OrgBirimSatir } from '@/lib/performans-amir'

import { performansKadroMudurlukEslesir, performansSicilEsit } from '@/lib/performans-kadro'

import {

  kadroGorevUnvani,

  kadroSatiriSicilEslesir,

  performansBelediyeBaskaniUnvaniMi,

  performansMudurUnvaniMi,

} from '@/lib/performans-unvan'



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

  kadro_mudurlugu?: string | null

  gorev_mudurlugu?: string | null

}



export function performansBelediyeBaskaniMi(

  sicilNo: string,

  birimler: OrgBirimSatir[],

  kadroRows: KadroSatir[],

): boolean {

  const hedef = sicilNo.trim()

  const baskanSicil = baskanSicilBul(birimler, kadroRows)

  if (baskanSicil && baskanSicil === hedef) return true

  const baskanBirim = birimler.find(b => b.birim_turu === 'baskan')

  if (baskanBirim?.personel_sicil_no === hedef) return true

  for (const r of kadroRows) {

    if (!kadroSatiriSicilEslesir(r, hedef)) continue

    if (performansBelediyeBaskaniUnvaniMi(kadroGorevUnvani(r))) return true

  }

  return false

}



/** Personelin görev unvanında «müdürü» geçiyorsa bağlı müdürlükler (asil/vekil fark etmez). */

export function performansMudurMudurlukleriFromKadro(

  sicilNo: string,

  kadroRows: KadroSatir[],

): string[] {

  const hedef = sicilNo.trim()

  const mudurlukler = new Set<string>()

  for (const r of kadroRows) {

    if (!kadroSatiriSicilEslesir(r, hedef)) continue

    for (const uv of [r.gorev_unvani, r.kadro_unvani]) {
      const u = String(uv ?? '').trim()
      if (!u || !performansMudurUnvaniMi(u)) continue
      const mud = String(r.gorev_mudurlugu ?? r.kadro_mudurlugu ?? '').trim()
      if (mud) mudurlukler.add(mud)
    }

  }

  return [...mudurlukler]

}



/**

 * Belediye başkanının organizasyon ağacına göre müdürlük kapsamı.

 * Başkana bağlı müdürlükler → 1. amir (tek amir); BY altı müdürlükler → 2. amir (müdür değerlendirmesi).

 */

export function performansBaskanOrgMudurlukleri(birimler: OrgBirimSatir[]): {

  amir1: string[]

  amir2: string[]

} {

  const amir1 = new Set<string>()

  const amir2 = new Set<string>()



  for (const b of birimler) {

    if (b.birim_turu !== 'mudurluk') continue

    const adi = b.mudurluk?.mudurluk_adi?.trim()

    if (!adi) continue

    const ust = birimler.find(u => u.id === b.ust_birim_id) ?? null



    if (ust?.birim_turu === 'baskan') {

      amir1.add(adi)

      amir2.add(adi)

    } else if (ust?.birim_turu === 'baskan_yardimcisi') {

      amir2.add(adi)

    }

  }



  return { amir1: [...amir1], amir2: [...amir2] }

}



/** Organizasyon ağacından müdür / BY / başkan kapsamındaki müdürlükleri bulur. */

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

      if (!adi) continue

      amir1.add(adi)

      amir2.add(adi)

    }

  }



  for (const b of birimler) {

    if (b.birim_turu !== 'mudurluk') continue

    const adi = b.mudurluk?.mudurluk_adi?.trim()

    if (!adi) continue

    const mudurSicil = mudurSicilForBaz(mudurlukEslesmeBaz(adi), kadroRows)

    if (mudurSicil === hedef) amir1.add(adi)

  }



  if (performansBelediyeBaskaniMi(hedef, birimler, kadroRows)) {

    const baskanOrg = performansBaskanOrgMudurlukleri(birimler)

    for (const m of baskanOrg.amir1) amir1.add(m)

    for (const m of baskanOrg.amir2) amir2.add(m)

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



  for (const mud of performansMudurMudurlukleriFromKadro(hedef, kadroRows)) {

    amir1.add(mud)

  }



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



export function performansAmirSatirGorulebilir(
  row: {
    amir1_sicil?: string | null
    amir2_sicil?: string | null
    tek_amir?: boolean
  },
  currentSicil: string,
  erisim: PerformansAmirErisim,
): boolean {
  const amir1 = performansSicilEsit(row.amir1_sicil, currentSicil)
  const amir2 = !row.tek_amir && performansSicilEsit(row.amir2_sicil, currentSicil)
  if (erisim.amir1Yetkisi && erisim.amir2Yetkisi) return amir1 || amir2
  if (erisim.amir1Yetkisi) return amir1
  if (erisim.amir2Yetkisi) return amir2
  return false
}

export function performansMudurlukErisimiVar(

  mudurlukAdi: string,

  erisim: PerformansAmirErisim,

): boolean {

  return erisim.gorulebilirMudurlukler.some(m =>

    performansKadroMudurlukEslesir(mudurlukAdi, m),

  )

}



export function performansMudurlukListesiFiltrele(

  mudurlukAdlari: string[],

  erisim: PerformansAmirErisim,

): string[] {

  return mudurlukAdlari.filter(m => performansMudurlukErisimiVar(m, erisim))

}


