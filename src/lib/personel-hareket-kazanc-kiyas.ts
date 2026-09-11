import type { KazancPuan } from '@/lib/terfi-ettir-hesap'
import { parseKidemYili, unvanAdiNorm, unvanSinifiThMi, yanOdemeTanimdan } from '@/lib/kazanc-yan-odeme'
import { parseKazancPuan } from '@/lib/kazanc-tasinir-yetkili'
import { kazancTaniminiKuralla } from '@/lib/kazanc-kural-uygula'
import { ogrenimYuksekMi, type TeknisyenEkGostergeBaglam } from '@/lib/kazanc-teknisyen-ek-gosterge'
import { eslestirOgrenimId, kazancIcinOgrenimSec } from '@/lib/kazanc-ogrenim-sec'
import { thYanOdemeYilSec } from '@/lib/th-hizmet-yili'

export type PersonelHareketKazancKiyasSatir = {
  alan: string
  giris: string
  kural: string
  uygun: boolean
}

export type PersonelHareketKazancKiyasSonuc = {
  aciklama: string | null
  satirlar: PersonelHareketKazancKiyasSatir[]
  tumuUygun: boolean
}

const KIYAS_ALANLARI = [
  { key: 'ek_gosterge', etiket: 'Ek Gösterge' },
  { key: 'ek_odeme', etiket: 'Ek Ödeme' },
  { key: 'oht', etiket: 'ÖHT' },
  { key: 'yan_odeme', etiket: 'Yan Ödeme' },
  { key: 'sds_orani', etiket: 'SDS' },
] as const

export type PersonelHareketKazancGiris = {
  unvanAdi: string | null
  kadroDerecesi: string | null
  khaDerece: string | null
  asilMi: boolean
  kidemYili: string | null
  ekGosterge: string | null
  ekOdeme: string | null
  oht: string | null
  yanOdeme: string | null
  sdsOrani: string | null
}

type OgrenimRow = {
  ogrenim_turu?: string | null
  varsayilan?: boolean | null
  kayit_zamani?: string | null
  kadrosu_ile_ilgili?: boolean | null
  teknik_ogrenim?: boolean | null
  meslegi?: string | null
  bolum?: string | null
}

function goster(v: string | null | undefined): string {
  const t = String(v ?? '').trim()
  return t || '—'
}

function puanUygun(giris: string, kural: string): boolean {
  const g = giris.trim()
  const k = kural.trim()
  if (g === '—' && k === '—') return true
  const ng = parseKazancPuan(g.replace('%', ''))
  const nk = parseKazancPuan(k.replace('%', ''))
  if (ng != null && nk != null) return ng === nk
  return g === k
}

export function unvanKaydiBul(
  unvanlar: Array<{ id: number; unvan_adi: string; sinif_adi: string | null; destek_yardimci_birim?: boolean | null }>,
  ad: string | null | undefined,
) {
  const t = String(ad ?? '').trim()
  if (!t) return null
  const exact = unvanlar.find(u => u.unvan_adi.trim() === t)
  if (exact) return exact
  const n = unvanAdiNorm(t)
  return unvanlar.find(u => unvanAdiNorm(u.unvan_adi) === n) ?? null
}

export function personelHareketKazancKiyasHesapla(input: {
  giris: PersonelHareketKazancGiris
  ogrenimRows: OgrenimRow[]
  tanimOgList: { id: number; isim: string }[]
  unvanlar: Array<{ id: number; unvan_adi: string; sinif_adi: string | null; destek_yardimci_birim?: boolean | null }>
  kazancLookup: (unvanId: number, ogrenimId: number, derece: number) => KazancPuan | null
  baglam: TeknisyenEkGostergeBaglam
  thHizmetBaslangic: string | null
  bilgisayarKullaniyor: boolean | null
}): PersonelHareketKazancKiyasSonuc {
  const { giris, ogrenimRows, tanimOgList, unvanlar, kazancLookup, baglam } = input
  const unvan = unvanKaydiBul(unvanlar, giris.unvanAdi)
  const kazancOg = kazancIcinOgrenimSec(ogrenimRows)
  const ogrenimId = eslestirOgrenimId(kazancOg?.ogrenim_turu, tanimOgList)
  const khaDerece = Number.parseInt(String(giris.khaDerece ?? '').trim(), 10)
  const dereceGecerli = Number.isFinite(khaDerece)

  if (!unvan) {
    return {
      aciklama: 'Unvan tanımı bulunamadı; kural hesaplanamadı.',
      satirlar: [],
      tumuUygun: false,
    }
  }
  if (ogrenimId == null) {
    return {
      aciklama: 'Kazanç öğrenimi eşleştirilemedi; kural hesaplanamadı.',
      satirlar: [],
      tumuUygun: false,
    }
  }
  if (!dereceGecerli) {
    return {
      aciklama: 'KHA derecesi okunamadı; kural hesaplanamadı.',
      satirlar: [],
      tumuUygun: false,
    }
  }

  const tanimHam = kazancLookup(unvan.id, ogrenimId, khaDerece)
  if (!tanimHam) {
    return {
      aciklama: `Kazanç tanımı yok (unvan + öğrenim + ${khaDerece}. derece).`,
      satirlar: [],
      tumuUygun: false,
    }
  }

  const tanim = kazancTaniminiKuralla(tanimHam, kazancLookup, {
    unvanId: unvan.id,
    ogrenimId,
    unvanAdi: unvan.unvan_adi,
    kadroDerecesi: giris.kadroDerecesi,
    khaDerece,
    yuksekOgrenimVar: ogrenimRows.some(r => ogrenimYuksekMi(r.ogrenim_turu)),
    kadrosuIleIlgili: ogrenimRows.some(r => ogrenimYuksekMi(r.ogrenim_turu) && r.kadrosu_ile_ilgili),
    teknikOgrenim: ogrenimRows.some(r => r.varsayilan && r.teknik_ogrenim),
    asilMi: giris.asilMi,
    destekYardimciBirim: unvan.destek_yardimci_birim === true,
    meslegi: kazancOg?.meslegi ?? null,
    bolum: kazancOg?.bolum ?? null,
    baglam,
  })

  const thMi = unvanSinifiThMi(unvan.sinif_adi)
  const kidem = thYanOdemeYilSec({
    thMi,
    thHizmetBaslangic: input.thHizmetBaslangic,
    kidemYili: parseKidemYili(giris.kidemYili),
  })
  const yanKural = yanOdemeTanimdan(tanim, kidem, thMi, unvan.unvan_adi, input.bilgisayarKullaniyor)

  const girisMap: Record<(typeof KIYAS_ALANLARI)[number]['key'], string | null> = {
    ek_gosterge: giris.ekGosterge,
    ek_odeme: giris.ekOdeme,
    oht: giris.oht,
    yan_odeme: giris.yanOdeme,
    sds_orani: giris.sdsOrani,
  }
  const kuralMap: Record<(typeof KIYAS_ALANLARI)[number]['key'], string | null> = {
    ek_gosterge: tanim.ek_gosterge,
    ek_odeme: tanim.ek_odeme,
    oht: tanim.oht,
    yan_odeme: yanKural,
    sds_orani: tanim.sds_orani,
  }

  const satirlar = KIYAS_ALANLARI.map(({ key, etiket }) => {
    const g = goster(girisMap[key])
    const k = goster(kuralMap[key])
    return { alan: etiket, giris: g, kural: k, uygun: puanUygun(g, k) }
  })

  return {
    aciklama: null,
    satirlar,
    tumuUygun: satirlar.every(s => s.uygun),
  }
}
