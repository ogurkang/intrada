import type { KazancPuan } from '@/lib/terfi-ettir-hesap'
import { parseKidemYili, unvanAdiNorm, unvanSinifiThMi, yanOdemeTanimdan } from '@/lib/kazanc-yan-odeme'
import { parseKazancPuan } from '@/lib/kazanc-tasinir-yetkili'
import { kazancTaniminiKuralla } from '@/lib/kazanc-kural-uygula'
import { mudurKariyerOgrenimKaynagi } from '@/lib/kazanc-mudur-th-overlay'
import {
  ogrenimYuksekMi,
  teknisyenKariyerUnvanFromOgrenimRows,
  type TeknisyenEkGostergeBaglam,
} from '@/lib/kazanc-teknisyen-ek-gosterge'
import { eslestirOgrenimId, kazancIcinOgrenimSec } from '@/lib/kazanc-ogrenim-sec'
import { OZEL_KALEM_KAZANC_DERECE, kazancBirinciDereceAciklama, unvanKazancBirinciDereceMi } from '@/lib/kazanc-ozel-kalem'
import { puanSdsYuruttuguUnvanIle, yuruttuguUnvanSdsAl } from '@/lib/kazanc-yuruttugu-unvan'
import { thYanOdemeYilSec } from '@/lib/th-hizmet-yili'
import { vekilMudurFarkHesapla, vekilMudurFarkKapsamiMi } from '@/lib/kazanc-vekil-mudur-fark'

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
  yuruttuguUnvanId?: number | null
  kendiUnvanAdi?: string | null
  kendiKadroDerecesi?: string | null
}): PersonelHareketKazancKiyasSonuc {
  const { giris, ogrenimRows, tanimOgList, unvanlar, kazancLookup, baglam } = input
  const unvan = unvanKaydiBul(unvanlar, giris.unvanAdi)
  const kazancOg = kazancIcinOgrenimSec(ogrenimRows)
  const ogrenimId = eslestirOgrenimId(kazancOg?.ogrenim_turu, tanimOgList)
  const khaDerece = Number.parseInt(String(giris.khaDerece ?? '').trim(), 10)
  const birinciDerece = unvanKazancBirinciDereceMi(unvan?.unvan_adi)
  const derece = birinciDerece ? OZEL_KALEM_KAZANC_DERECE : khaDerece
  const dereceGecerli = birinciDerece || Number.isFinite(khaDerece)

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

  const tanimHam = kazancLookup(unvan.id, ogrenimId, derece)
  if (!tanimHam) {
    return {
      aciklama: `Kazanç tanımı yok (unvan + öğrenim + ${derece}. derece).`,
      satirlar: [],
      tumuUygun: false,
    }
  }

  const teknisyenKariyer = teknisyenKariyerUnvanFromOgrenimRows(ogrenimRows)
  const kariyerOg = mudurKariyerOgrenimKaynagi(
    ogrenimRows.find(r => r.varsayilan),
    kazancOg,
  )
  const tanim = kazancTaniminiKuralla(tanimHam, kazancLookup, {
    unvanId: unvan.id,
    ogrenimId,
    unvanAdi: unvan.unvan_adi,
    kadroDerecesi: giris.kadroDerecesi,
    khaDerece: Number.isFinite(khaDerece) ? khaDerece : birinciDerece ? OZEL_KALEM_KAZANC_DERECE : null,
    yuksekOgrenimVar: ogrenimRows.some(r => ogrenimYuksekMi(r.ogrenim_turu)),
    kadrosuIleIlgili: teknisyenKariyer != null,
    teknisyenKariyer,
    teknikOgrenim: ogrenimRows.some(r => r.varsayilan && r.teknik_ogrenim),
    asilMi: giris.asilMi,
    destekYardimciBirim: unvan.destek_yardimci_birim === true,
    meslegi: kariyerOg.meslegi,
    bolum: kariyerOg.bolum,
    baglam,
  })

  const thMi = unvanSinifiThMi(unvan.sinif_adi)
  const kidem = thYanOdemeYilSec({
    thMi,
    thHizmetBaslangic: input.thHizmetBaslangic,
    kidemYili: parseKidemYili(giris.kidemYili),
  })
  const yanKural = yanOdemeTanimdan(tanim, kidem, thMi, unvan.unvan_adi, input.bilgisayarKullaniyor)
  const yurutSds = yuruttuguUnvanSdsAl(kazancLookup, {
    yuruttuguUnvanId: input.yuruttuguUnvanId,
    ogrenimId,
    derece: Number.isFinite(khaDerece) ? khaDerece : derece,
  })
  const tanimSds = puanSdsYuruttuguUnvanIle(tanim, yurutSds)

  const girisMap: Record<(typeof KIYAS_ALANLARI)[number]['key'], string | null> = {
    ek_gosterge: giris.ekGosterge,
    ek_odeme: giris.ekOdeme,
    oht: giris.oht,
    yan_odeme: giris.yanOdeme,
    sds_orani: giris.sdsOrani,
  }
  let kuralMap: Record<(typeof KIYAS_ALANLARI)[number]['key'], string | null> = {
    ek_gosterge: tanim.ek_gosterge,
    ek_odeme: tanim.ek_odeme,
    oht: tanim.oht,
    yan_odeme: yanKural,
    sds_orani: tanimSds.sds_orani,
  }
  let aciklama = kazancBirinciDereceAciklama(unvan.unvan_adi)

  const vekilFark = vekilMudurFarkKapsamiMi(giris.asilMi ? 'asil' : 'vekil', unvan.unvan_adi)
  if (vekilFark) {
    const kendiUnvan = unvanKaydiBul(unvanlar, input.kendiUnvanAdi)
    if (!kendiUnvan) {
      return {
        aciklama: 'Vekil müdür farkı için asil kadro unvanı bulunamadı.',
        satirlar: [],
        tumuUygun: false,
      }
    }
    const fark = vekilMudurFarkHesapla({
      lookup: kazancLookup,
      khaDerece: Number.isFinite(khaDerece) ? khaDerece : derece,
      kendiOpts: {
        unvanId: kendiUnvan.id,
        ogrenimId,
        unvanAdi: kendiUnvan.unvan_adi,
        kadroDerecesi: input.kendiKadroDerecesi ?? giris.kadroDerecesi,
        khaDerece: Number.isFinite(khaDerece) ? khaDerece : derece,
        yuksekOgrenimVar: ogrenimRows.some(r => ogrenimYuksekMi(r.ogrenim_turu)),
        kadrosuIleIlgili: teknisyenKariyer != null,
        teknisyenKariyer,
        teknikOgrenim: ogrenimRows.some(r => r.varsayilan && r.teknik_ogrenim),
        asilMi: true,
        destekYardimciBirim: kendiUnvan.destek_yardimci_birim === true,
        meslegi: kariyerOg.meslegi,
        bolum: kariyerOg.bolum,
        baglam,
      },
      mudurOpts: {
        unvanId: unvan.id,
        ogrenimId,
        unvanAdi: unvan.unvan_adi,
        kadroDerecesi: giris.kadroDerecesi,
        khaDerece: Number.isFinite(khaDerece) ? khaDerece : derece,
        yuksekOgrenimVar: ogrenimRows.some(r => ogrenimYuksekMi(r.ogrenim_turu)),
        kadrosuIleIlgili: teknisyenKariyer != null,
        teknisyenKariyer,
        teknikOgrenim: ogrenimRows.some(r => r.varsayilan && r.teknik_ogrenim),
        asilMi: true,
        destekYardimciBirim: unvan.destek_yardimci_birim === true,
        meslegi: kariyerOg.meslegi,
        bolum: kariyerOg.bolum,
        baglam,
      },
    })
    if (!fark) {
      return {
        aciklama: 'Vekil müdür farkı hesaplanamadı (kazanç tanımı eksik olabilir).',
        satirlar: [],
        tumuUygun: false,
      }
    }
    kuralMap = {
      ek_gosterge: fark.fark.ek_gosterge,
      ek_odeme: fark.fark.ek_odeme,
      oht: fark.fark.oht,
      yan_odeme: fark.fark.yan_odeme,
      sds_orani: fark.fark.sds_orani,
    }
    aciklama =
      `Vekalet farkı (asil müdür − ${kendiUnvan.unvan_adi}). ` +
      'Giriş, asil bir müdürün alacağı ile kendi unvan kazancı arasındaki fark olmalıdır.'
  }

  const satirlar = KIYAS_ALANLARI.map(({ key, etiket }) => {
    const g = goster(girisMap[key])
    const k = goster(kuralMap[key])
    return { alan: etiket, giris: g, kural: k, uygun: puanUygun(g, k) }
  })

  return {
    aciklama,
    satirlar,
    tumuUygun: satirlar.every(s => s.uygun),
  }
}
