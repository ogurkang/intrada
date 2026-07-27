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

import { baskanSicilBul, baskanYardimcisiBirimindeMi, mudurSicilForBaz, type OrgBirimSatir } from '@/lib/performans-amir'

import { performansKadroMudurlukEslesir, performansSicilEsit } from '@/lib/performans-kadro'

import { degerlendirmeTamamlandi, yuzdeHesapla, type PerformansDegOzet } from '@/lib/performans-istatistik'

import {

  kadroGorevUnvani,

  kadroSatiriSicilEslesir,

  performansBaskanYardimcisiUnvaniMi,

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



/**

 * Müdür (1. amir) tek ekran landing: müdürlük hub atlanır, personel gruplu listelenir.

 * BBY, başkan ve yalnızca 2. amir olan kullanıcılar hariç.

 */

export function performansMudurLandingMi(

  currentSicil: string,

  birimler: OrgBirimSatir[],

  kadroRows: KadroSatir[],

  filtreliListe: Array<{ amir1_sicil?: string | null; sicil_no: string }>,

  etkinUnvanMap: Map<string, string | null | undefined>,

  erisim: PerformansAmirErisim,

): boolean {

  if (!erisim.amir1Yetkisi) return false



  const hedef = currentSicil.trim()

  if (!hedef) return false



  if (performansBelediyeBaskaniMi(hedef, birimler, kadroRows)) return false



  const byBirim = birimler.find(

    b => b.birim_turu === 'baskan_yardimcisi' && b.personel_sicil_no === hedef,

  )

  if (byBirim) return false



  if (performansMudurMudurlukleriFromKadro(hedef, kadroRows).length === 0) return false



  return filtreliListe.some(r => {

    if (!performansSicilEsit(r.amir1_sicil, hedef)) return false

    const unvan = etkinUnvanMap.get(r.sicil_no) ?? ''

    if (performansMudurUnvaniMi(unvan)) return false

    if (performansBelediyeBaskaniUnvaniMi(unvan)) return false

    if (performansBaskanYardimcisiUnvaniMi(unvan)) return false

    return true

  })

}



/**

 * BBY (1. amir) tek ekran landing: yalnızca bağlı müdürler listelenir.

 */

export function performansBbyAmir1LandingMi(

  currentSicil: string,

  birimler: OrgBirimSatir[],

  filtreliListe: Array<{ amir1_sicil?: string | null; sicil_no: string }>,

  etkinUnvanMap: Map<string, string | null | undefined>,

  erisim: PerformansAmirErisim,

): boolean {

  if (!erisim.amir1Yetkisi) return false



  const hedef = currentSicil.trim()

  if (!hedef) return false



  const byBirim = birimler.find(

    b => b.birim_turu === 'baskan_yardimcisi' && b.personel_sicil_no === hedef,

  )

  if (!byBirim) return false



  return filtreliListe.some(r => {

    if (!performansSicilEsit(r.amir1_sicil, hedef)) return false

    return performansMudurUnvaniMi(etkinUnvanMap.get(r.sicil_no) ?? '')

  })

}



/** BBY 1. amir landing listesinde gösterilecek müdür satırları. */

export function performansBbyAmir1MudurSatirlari<

  T extends { amir1_sicil?: string | null; sicil_no: string },

>(

  currentSicil: string,

  filtreliListe: T[],

  etkinUnvanMap: Map<string, string | null | undefined>,

): T[] {

  const hedef = currentSicil.trim()

  return filtreliListe.filter(r => {

    if (!performansSicilEsit(r.amir1_sicil, hedef)) return false

    return performansMudurUnvaniMi(etkinUnvanMap.get(r.sicil_no) ?? '')

  })

}



export type BbyAmir2MudurlukOzet = {

  mudurlukAdi: string

  personelSayisi: number

  tamamlanmaYuzde: number

}



export type BbyAmir2MudurGrubu = {

  mudurSicil: string

  mudurAd: string

  mudurlukler: BbyAmir2MudurlukOzet[]

}



/** BBY 2. amir kapsamındaki memur/şef satırları (müdür/BY/başkan hariç). */

export function performansBbyAmir2PersonelSatirlari<

  T extends {

    amir2_sicil?: string | null

    amir1_sicil?: string | null

    sicil_no: string

    tek_amir?: boolean

  },

>(

  currentSicil: string,

  filtreliListe: T[],

  etkinUnvanMap: Map<string, string | null | undefined>,

): T[] {

  const hedef = currentSicil.trim()

  return filtreliListe.filter(r => {

    if (r.tek_amir) return false

    if (!performansSicilEsit(r.amir2_sicil, hedef)) return false

    const unvan = etkinUnvanMap.get(r.sicil_no) ?? ''

    if (performansMudurUnvaniMi(unvan)) return false

    if (performansBelediyeBaskaniUnvaniMi(unvan)) return false

    if (performansBaskanYardimcisiUnvaniMi(unvan)) return false

    return true

  })

}



/** BBY (2. amir) landing: müdür başlıkları altında müdürlük hiyerarşisi. */

export function performansBbyAmir2LandingMi(

  currentSicil: string,

  birimler: OrgBirimSatir[],

  filtreliListe: Array<{ amir2_sicil?: string | null; amir1_sicil?: string | null; sicil_no: string; tek_amir?: boolean }>,

  etkinUnvanMap: Map<string, string | null | undefined>,

  erisim: PerformansAmirErisim,

): boolean {

  if (!erisim.amir2Yetkisi) return false



  const hedef = currentSicil.trim()

  if (!hedef) return false



  const byBirim = birimler.find(

    b => b.birim_turu === 'baskan_yardimcisi' && b.personel_sicil_no === hedef,

  )

  if (!byBirim) return false



  return performansBbyAmir2PersonelSatirlari(hedef, filtreliListe, etkinUnvanMap).length > 0

}



/** Müdür → müdürlük grupları (BBY 2. amir landing). */

export function performansBbyAmir2MudurGruplariOlustur(

  amir2Satirlar: PerformansDegOzet[],

  adMap: Record<string, string>,

): BbyAmir2MudurGrubu[] {

  const mudurMap = new Map<string, Map<string, PerformansDegOzet[]>>()



  for (const r of amir2Satirlar) {

    const mudurSicil = String(r.amir1_sicil ?? '').trim()

    if (!mudurSicil) continue

    const mudAdi = String(r.kadro_mudurlugu ?? r.mudurluk_adi ?? '').trim()

    if (!mudAdi) continue

    if (!mudurMap.has(mudurSicil)) mudurMap.set(mudurSicil, new Map())

    const mudMap = mudurMap.get(mudurSicil)!

    if (!mudMap.has(mudAdi)) mudMap.set(mudAdi, [])

    mudMap.get(mudAdi)!.push(r)

  }



  return [...mudurMap.entries()]

    .map(([mudurSicil, mudMap]) => {

      const mudurlukler = [...mudMap.entries()]

        .sort(([a], [b]) => a.localeCompare(b, 'tr'))

        .map(([mudurlukAdi, personel]) => {

          const tamam = personel.filter(degerlendirmeTamamlandi).length

          return {

            mudurlukAdi,

            personelSayisi: personel.length,

            tamamlanmaYuzde: yuzdeHesapla(tamam, personel.length),

          }

        })

      return {

        mudurSicil,

        mudurAd: adMap[mudurSicil] ?? mudurSicil,

        mudurlukler,

      }

    })

    .sort((a, b) => a.mudurAd.localeCompare(b.mudurAd, 'tr'))

}



export type BbyAmir2FlatSatir = BbyAmir2MudurlukOzet & {

  siraNo: number

  mudurSicil: string

  mudurAd: string

}



/** BBY 2. amir landing: tek tablo — müdürlük adı + müdür adı. */

export function performansBbyAmir2FlatListeOlustur(

  amir2Satirlar: PerformansDegOzet[],

  adMap: Record<string, string>,

): BbyAmir2FlatSatir[] {

  const gruplar = performansBbyAmir2MudurGruplariOlustur(amir2Satirlar, adMap)

  const flat = gruplar.flatMap(g =>

    g.mudurlukler.map(m => ({

      ...m,

      mudurSicil: g.mudurSicil,

      mudurAd: g.mudurAd,

    })),

  )

  flat.sort((a, b) => a.mudurlukAdi.localeCompare(b.mudurlukAdi, 'tr'))

  return flat.map((row, i) => ({ ...row, siraNo: i + 1 }))

}



/** Başkan landing: müdür + BBY doğrudan değerlendirme satırları. */

export function performansBaskanDogrudanSatirlari<

  T extends {

    sicil_no: string

    amir1_sicil?: string | null

    amir2_sicil?: string | null

    tek_amir?: boolean

  },

>(

  currentSicil: string,

  birimler: OrgBirimSatir[],

  filtreliListe: T[],

  etkinUnvanMap: Map<string, string | null | undefined>,

): T[] {

  const hedef = currentSicil.trim()

  return filtreliListe.filter(r => {

    const unvan = etkinUnvanMap.get(r.sicil_no) ?? ''

    const amir1 = performansSicilEsit(r.amir1_sicil, hedef)

    const amir2 = !r.tek_amir && performansSicilEsit(r.amir2_sicil, hedef)

    if (!amir1 && !amir2) return false

    if (performansMudurUnvaniMi(unvan)) return true

    if (performansBaskanYardimcisiUnvaniMi(unvan)) return true

    if (baskanYardimcisiBirimindeMi(r.sicil_no, birimler)) return true

    return false

  })

}



/** Başkan landing: personel (memur/şef) satırları. */

export function performansBaskanPersonelSatirlari<

  T extends {

    sicil_no: string

    amir1_sicil?: string | null

    amir2_sicil?: string | null

    tek_amir?: boolean

  },

>(

  currentSicil: string,

  filtreliListe: T[],

  etkinUnvanMap: Map<string, string | null | undefined>,

  birimler: OrgBirimSatir[],

): T[] {

  const hedef = currentSicil.trim()

  return filtreliListe.filter(r => {

    const unvan = etkinUnvanMap.get(r.sicil_no) ?? ''

    if (performansMudurUnvaniMi(unvan)) return false

    if (performansBelediyeBaskaniUnvaniMi(unvan)) return false

    if (performansBaskanYardimcisiUnvaniMi(unvan)) return false

    if (baskanYardimcisiBirimindeMi(r.sicil_no, birimler)) return false

    const amir1 = performansSicilEsit(r.amir1_sicil, hedef)

    const amir2 = !r.tek_amir && performansSicilEsit(r.amir2_sicil, hedef)

    return amir1 || amir2

  })

}



/** Belediye başkanı özel landing. */

export function performansBaskanLandingMi(

  currentSicil: string,

  birimler: OrgBirimSatir[],

  kadroRows: KadroSatir[],

  filtreliListe: unknown[],

): boolean {

  if (!performansBelediyeBaskaniMi(currentSicil, birimler, kadroRows)) return false

  return filtreliListe.length > 0

}


