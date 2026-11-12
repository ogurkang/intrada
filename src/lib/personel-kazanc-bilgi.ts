import type { TerfiKaynak } from '@/lib/terfi-ettir-hesap'
import { unvanBelediyeBaskanYardimcisiMi } from '@/lib/kazanc-ozel-kalem'
import { unvanMuduruMi } from '@/lib/kazanc-mudur-th-overlay'
import { kalemleriKur, type PersonelKazancKuralKalem } from '@/lib/personel-kazanc-kural'

export type PersonelKazancBilgiKadro = {
  rol: 'Asil' | 'Vekil'
  kadro_sira_no: string | null
  kadro_unvani: string | null
  gorev_unvani: string | null
  kadro_mudurlugu: string | null
  gorev_mudurlugu: string | null
  statu: string | null
  kadro_derecesi: string | null
}

export type PersonelKazancBilgiTerfi = {
  rol: 'Asil' | 'Vekil'
  unvan_adi: string | null
  kadro_derecesi: string | null
  gorev_ayligi_derece: string | null
  gorev_ayligi_kademe: string | null
  kha_derece: string | null
  kha_kademe: string | null
  kha_tarihi: string | null
  ekea_derece: string | null
  ekea_kademe: string | null
  ekea_tarihi: string | null
  kidem_yili: string | null
  kidem_tarihi: string | null
  iyi_hal_terfi_tarihi: string | null
  ek_gosterge: string | null
  ek_odeme: string | null
  oht: string | null
  yan_odeme: string | null
  sds_orani: string | null
}

export type PersonelKazancBilgiOgrenim = {
  ogrenim_turu: string | null
  meslegi: string | null
  varsayilan: boolean
  kadrosu_ile_ilgili: boolean
  teknik_ogrenim: boolean
}

export type PersonelKazancBilgiKart = {
  sicil_no: string
  ad_soyad: string
  asilUnvan: string | null
  vekilUnvanlar: string[]
  /** Filtre / PDF için asil + vekil unvan listesi */
  unvanlar: string[]
  ogrenimler: PersonelKazancBilgiOgrenim[]
  kadrolar: PersonelKazancBilgiKadro[]
  terfiler: PersonelKazancBilgiTerfi[]
  mevzuat: PersonelKazancKuralKalem[]
}

export function personelKazancBilgiKapsamindaMi(list: TerfiKaynak[]): boolean {
  return list.some(
    k => unvanMuduruMi(k.unvan_adi) || unvanBelediyeBaskanYardimcisiMi(k.unvan_adi),
  )
}

function metin(v: string | null | undefined): string | null {
  const t = String(v ?? '').trim()
  return t || null
}

export function personelKazancBilgiKartlariKur(input: {
  kaynaklar: TerfiKaynak[]
  kadroBySicil: Map<string, PersonelKazancBilgiKadro[]>
  ogrenimBySicil: Map<string, PersonelKazancBilgiOgrenim[]>
  gorevAyligiByTerfiId: Map<number, { derece: string | null; kademe: string | null }>
}): PersonelKazancBilgiKart[] {
  const grup = new Map<string, TerfiKaynak[]>()
  for (const k of input.kaynaklar) {
    const list = grup.get(k.sicil_no)
    if (list) list.push(k)
    else grup.set(k.sicil_no, [k])
  }

  const kartlar: PersonelKazancBilgiKart[] = []
  for (const [sicil, list] of grup) {
    if (!personelKazancBilgiKapsamindaMi(list)) continue
    const asil = list.find(k => k.kadro_rolu === 'Asil') ?? null
    const vekiller = list.filter(k => k.kadro_rolu === 'Vekil' || k.vekil_mudur_fark_mi)
    const kuralKaynak = asil ?? list[0]
    if (!kuralKaynak) continue

    const asilUnvan = metin(asil?.unvan_adi)
    const vekilUnvanlar = [...new Set(vekiller.map(v => metin(v.unvan_adi)).filter((x): x is string => !!x))]
    const unvanlar = [...new Set([asilUnvan, ...vekilUnvanlar].filter((x): x is string => !!x))]

    const terfiler: PersonelKazancBilgiTerfi[] = list.map(k => {
      const ga = k.terfi_id != null ? input.gorevAyligiByTerfiId.get(k.terfi_id) : undefined
      return {
        rol: k.kadro_rolu === 'Vekil' || k.vekil_mudur_fark_mi ? 'Vekil' : 'Asil',
        unvan_adi: metin(k.unvan_adi),
        kadro_derecesi: metin(k.kadro_derecesi),
        gorev_ayligi_derece: metin(ga?.derece),
        gorev_ayligi_kademe: metin(ga?.kademe),
        kha_derece: metin(k.kha_derece),
        kha_kademe: metin(k.kha_kademe),
        kha_tarihi: metin(k.kha_tarihi),
        ekea_derece: metin(k.ekea_derece),
        ekea_kademe: metin(k.ekea_kademe),
        ekea_tarihi: metin(k.ekea_tarihi),
        kidem_yili: metin(k.kidem_yili),
        kidem_tarihi: metin(k.kidem_tarihi),
        iyi_hal_terfi_tarihi: metin(k.iyi_hal_terfi_tarihi),
        ek_gosterge: metin(k.ek_gosterge),
        ek_odeme: metin(k.ek_odeme),
        oht: metin(k.oht),
        yan_odeme: metin(k.yan_odeme),
        sds_orani: metin(k.sds_orani),
      }
    })

    kartlar.push({
      sicil_no: sicil,
      ad_soyad: kuralKaynak.ad_soyad ?? sicil,
      asilUnvan,
      vekilUnvanlar,
      unvanlar,
      ogrenimler: input.ogrenimBySicil.get(sicil) ?? [],
      kadrolar: input.kadroBySicil.get(sicil) ?? [],
      terfiler,
      mevzuat: kalemleriKur(
        kuralKaynak,
        vekiller.some(v => v.vekil_mudur_fark_mi || unvanMuduruMi(v.unvan_adi)),
        false,
      ),
    })
  }

  return kartlar.sort(
    (a, b) =>
      (Number.parseInt(a.sicil_no, 10) || 0) - (Number.parseInt(b.sicil_no, 10) || 0) ||
      a.sicil_no.localeCompare(b.sicil_no, 'tr'),
  )
}
