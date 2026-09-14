import { unvanAdiNorm } from '@/lib/kazanc-yan-odeme'
import { formatKazancPuan, parseKazancPuan } from '@/lib/kazanc-tasinir-yetkili'
import {
  parseDerece,
  yuksekDerece657,
  type KazancSatirLookup,
  type TeknisyenEkGostergeBaglam,
} from '@/lib/kazanc-teknisyen-ek-gosterge'

/** 2006/10344 I sayılı cetvel B dipnot 3/a + md. 4/a TG tavanı: +1400’den yalnızca +1300 kalır → 1100+1300=2400. */
export const MUDUR_KARIYER_YAN_EK = 1300
export const MUDUR_KARIYER_YAN_TAVAN = 2400
/** Grup 8 + 40 (mühendis/mimar/şehir plancısı). TH Mühendis satırındaki %160 kopyalanmaz. İç / peyzaj mimar dahil değil. */
export const MUDUR_KARIYER_OHT_MUHENDIS = '195'
/** Grup 9 + 40 (kimyager). */
export const MUDUR_KARIYER_OHT_KIMYAGER = '185'

export type MudurKariyerTuru = 'muhendis' | 'kimyager' | 'icmimar' | 'peyzajmimar'

function metinKucuk(v: string | null | undefined): string {
  return String(v ?? '').trim().toLocaleLowerCase('tr-TR')
}

function ogrenimNorm(meslegi: string | null | undefined, bolum: string | null | undefined): string {
  return unvanAdiNorm(`${meslegi ?? ''} ${bolum ?? ''}`)
}

/** Meslek / bölüm metninde iç mimar (iç mimarlık dahil). «mimar» ile karışmasın. */
export function icMimarOgrenimMi(meslegi: string | null | undefined, bolum: string | null | undefined): boolean {
  return ogrenimNorm(meslegi, bolum).includes('ICMIMAR')
}

/** Meslek / bölüm metninde peyzaj mimarı (peyzaj mimarlığı dahil). */
export function peyzajMimarOgrenimMi(meslegi: string | null | undefined, bolum: string | null | undefined): boolean {
  return ogrenimNorm(meslegi, bolum).includes('PEYZAJMIMAR')
}

/** Unvan adında «müdürü» geçer; «Müdür Yardımcısı» eşleşmez. */
export function unvanMuduruMi(unvanAdi: string | null | undefined): boolean {
  return unvanAdiNorm(unvanAdi).includes('MUDURU')
}

/**
 * Kazanç için seçilen öğrenim `meslegi` veya `bolum` metninden kariyer.
 * mühendis / mimar / şehir plancısı → Mühendis tanımı; kimyager → Kimyager.
 * İç mimar bu gruptan ayrı: ÖHT İç Mimar tanımından, ek gösterge / yan ödeme müdürde kalır.
 * Peyzaj mimarı: ek gösterge ve yan ödeme mühendis grubu gibi; yalnızca ÖHT Peyzaj Mimarı tanımından.
 */
export function mudurKariyerTuru(
  meslegi: string | null | undefined,
  bolum: string | null | undefined,
): MudurKariyerTuru | null {
  const t = `${metinKucuk(meslegi)} ${metinKucuk(bolum)}`
  if (!t.trim()) return null
  if (icMimarOgrenimMi(meslegi, bolum)) return 'icmimar'
  if (peyzajMimarOgrenimMi(meslegi, bolum)) return 'peyzajmimar'
  if (t.includes('mühendis') || t.includes('muhendis')) return 'muhendis'
  if (t.includes('mimar')) return 'muhendis'
  if (t.includes('şehir planc') || t.includes('sehir planc')) return 'muhendis'
  if (t.includes('kimyager')) return 'kimyager'
  return null
}

function doluMetin(v: string | null | undefined): string | null {
  const t = String(v ?? '').trim()
  return t ? t : null
}

function ekGostergeMax(a: string | null | undefined, b: string | null | undefined): string | null {
  const na = parseKazancPuan(a)
  const nb = parseKazancPuan(b)
  if (na == null && nb == null) return doluMetin(a) ?? doluMetin(b)
  if (na == null) return doluMetin(b)
  if (nb == null) return doluMetin(a)
  return formatKazancPuan(Math.max(na, nb))
}

export function mudurKariyerYanOdeme(
  mudurYan: string | null | undefined,
  destekYardimciBirim: boolean,
): string | null {
  const mevcut = doluMetin(mudurYan)
  if (destekYardimciBirim) return mevcut
  const n = parseKazancPuan(mevcut)
  if (n == null) return mevcut
  return formatKazancPuan(Math.min(n + MUDUR_KARIYER_YAN_EK, MUDUR_KARIYER_YAN_TAVAN))
}

function kariyerSatirOku(
  lookup: KazancSatirLookup,
  unvanId: number | null,
  derece: number,
  ogrenimIds: number[],
): NonNullable<ReturnType<KazancSatirLookup>> | null {
  if (unvanId == null || !ogrenimIds.length) return null
  for (const ogId of ogrenimIds) {
    const row = lookup(unvanId, ogId, derece)
    if (row) return row
  }
  return null
}

function ohtMax(a: string | null | undefined, b: string | null | undefined): string | null {
  return ekGostergeMax(a, b)
}

function kariyerOhtUnvanId(
  kariyer: MudurKariyerTuru,
  baglam: TeknisyenEkGostergeBaglam,
): number | null {
  if (kariyer === 'icmimar') return baglam.icMimarUnvanId
  if (kariyer === 'peyzajmimar') return baglam.peyzajMimarUnvanId
  return null
}

/**
 * Asıl müdür ÖHT: kadro ile KHA’dan 657’ye göre yüksek olan derecedeki müdür tanımı
 * (ek gösterge ile aynı derece seçimi). KHA daha yüksekse satır zaten o derecededir.
 */
export function mudurOhtYuksekDerecedenUygula<T extends { oht?: string | null }>(
  puan: T,
  lookup: KazancSatirLookup,
  opts: {
    unvanId: number | null | undefined
    ogrenimId: number | null | undefined
    unvanAdi: string | null | undefined
    kadroDerecesi: string | number | null | undefined
    khaDerece: number | null | undefined
    asilMi: boolean
  },
): T {
  if (!opts.asilMi || !unvanMuduruMi(opts.unvanAdi)) return puan
  const unvanId = opts.unvanId
  const ogrenimId = opts.ogrenimId
  if (unvanId == null || ogrenimId == null) return puan
  const ohtDerece = yuksekDerece657(parseDerece(opts.kadroDerecesi), parseDerece(opts.khaDerece))
  const kha = parseDerece(opts.khaDerece)
  if (ohtDerece == null) return puan
  if (kha != null && ohtDerece === kha) return puan
  const oht = doluMetin(lookup(unvanId, ogrenimId, ohtDerece)?.oht)
  if (oht == null) return puan
  return { ...puan, oht }
}

/**
 * Asil GİH müdürü + TH kariyer öğrenimi:
 * ek gösterge = max(müdür, kariyer TH); yan ödeme = destek tiki yoksa min(müdür+1300, 2400);
 * ÖHT = max(müdür, 195 mühendis / 185 kimyager).
 * İç mimar: 195 / +1300 uygulanmaz; ÖHT İç Mimar kazanç satırından alınır.
 * Peyzaj mimarı: ek gösterge ve yan ödeme mühendis grubu gibi kalır; yalnızca ÖHT Peyzaj Mimarı satırından alınır.
 * Vekil ve müdür yardımcısı uygulanmaz. Ek ödeme / SDS müdür tanımında kalır.
 */
export function mudurThKariyerUygula<
  T extends {
    ek_gosterge: string | null
    yan_odeme?: string | null
    oht?: string | null
  },
>(
  puan: T,
  lookup: KazancSatirLookup,
  opts: {
    unvanAdi: string | null | undefined
    kadroDerecesi: string | number | null | undefined
    khaDerece: number | null | undefined
    asilMi: boolean
    destekYardimciBirim: boolean
    meslegi: string | null | undefined
    bolum: string | null | undefined
    baglam: TeknisyenEkGostergeBaglam | null | undefined
  },
): T {
  if (!opts.asilMi || !unvanMuduruMi(opts.unvanAdi)) return puan
  const kariyer = mudurKariyerTuru(opts.meslegi, opts.bolum)
  if (!kariyer) return puan
  const baglam = opts.baglam
  if (!baglam) return puan

  const derece = yuksekDerece657(parseDerece(opts.kadroDerecesi), parseDerece(opts.khaDerece))
  if (derece == null) return puan

  const ozelOhtUnvanId = kariyerOhtUnvanId(kariyer, baglam)
  if (kariyer === 'icmimar') {
    const satir = kariyerSatirOku(lookup, ozelOhtUnvanId, derece, baglam.lisansOnlisansOgrenimIds)
    const kariyerOht = doluMetin(satir?.oht)
    if (kariyerOht == null) return puan
    return { ...puan, oht: kariyerOht }
  }

  const kariyerUnvanId = kariyer === 'kimyager' ? baglam.kimyagerUnvanId : baglam.muhendisUnvanId
  const kariyerSatir = kariyerSatirOku(lookup, kariyerUnvanId, derece, baglam.lisansOnlisansOgrenimIds)

  let oht: string | null
  if (kariyer === 'peyzajmimar') {
    const peyzajSatir = kariyerSatirOku(lookup, baglam.peyzajMimarUnvanId, derece, baglam.lisansOnlisansOgrenimIds)
    oht = doluMetin(peyzajSatir?.oht) ?? ohtMax(puan.oht, MUDUR_KARIYER_OHT_MUHENDIS)
  } else if (kariyer === 'kimyager') {
    oht = ohtMax(puan.oht, MUDUR_KARIYER_OHT_KIMYAGER)
  } else {
    oht = ohtMax(puan.oht, MUDUR_KARIYER_OHT_MUHENDIS)
  }

  let sonraki: T = {
    ...puan,
    yan_odeme: mudurKariyerYanOdeme(puan.yan_odeme, opts.destekYardimciBirim),
    oht,
  }
  const kariyerEk = doluMetin(kariyerSatir?.ek_gosterge)
  if (kariyerEk != null) {
    sonraki = { ...sonraki, ek_gosterge: ekGostergeMax(puan.ek_gosterge, kariyerEk) }
  }
  return sonraki
}
