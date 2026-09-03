import {
  BILDIRIM_BIRIM,
  BILDIRIM_MAKAM,
  bildirimTarihFormat,
} from '@/lib/bildirim-belge-ortak'
import { trNormalize } from '@/lib/turkce-search'

export const OKULA_UYUM_IZIN_MAKAM = BILDIRIM_MAKAM
export const OKULA_UYUM_IZIN_BIRIM = BILDIRIM_BIRIM

export const OKULA_UYUM_SINIF_SECENEKLERI = ['1. Sınıf', '5. Sınıf'] as const
export type OkulaUyumSinif = (typeof OKULA_UYUM_SINIF_SECENEKLERI)[number]

export const OKULA_UYUM_YAZI_SAYISI = 'E-66836956-010.07-404473'
export const OKULA_UYUM_HAFTA = '7-11 Eylül 2026'
export const OKULA_UYUM_DONEM = '2026-2027 Eğitim-Öğretim Döneminde'

export function okulaUyumIzinTarihFormat(d: Date = new Date()): string {
  return bildirimTarihFormat(d)
}

function mudurlukBelgede(mudurluk: string): string {
  const ad = mudurluk.trim()
  if (!ad) return 'Belediyenizde'
  const n = trNormalize(ad)
  if (n.includes('mudurlugu') || n.endsWith('mudurluk')) return `${ad}'nde`
  return `${ad} Müdürlüğü'nde`
}

export function okulaUyumIzinParagraflar(p: {
  sicil_no: string
  unvan: string
  mudurluk: string
}): string[] {
  const sicil = String(p.sicil_no ?? '').trim()
  const unvan = String(p.unvan ?? '').trim()
  const mud = mudurlukBelgede(p.mudurluk)

  return [
    `Belediyenizde ${sicil} sicil numarası ile ${unvan} olarak ${mud} çalışmaktayım.`,
    `Milli Eğitim Bakanlığı'nca Maarif Model kapsamında ${OKULA_UYUM_DONEM} 1. ve 5. Sınıf öğrencilerine yönelik uyum haftası uygulaması çerçevesinde ailelerden bir kişinin velisi olarak öğrenci ile birlikte ${OKULA_UYUM_HAFTA} haftasında katılım sağlayabileceği belirtilmiştir.`,
    `Bu kapsamda Cumhurbaşkanlığı Genel Sekreterliği Personel ve Prensipler Genel Müdürlüğü'nün ${OKULA_UYUM_YAZI_SAYISI} sayılı yazısına istinaden aşağıda bilgileri bulunan öğrenci için okulca yapılacak etkinliklere katılım ile sınırlı olmak üzere üç saatlik idari izin verilmesi hususunda gereğini arz ederim.`,
  ]
}

export interface OkulaUyumIzinBelgeAlanlari {
  tarih: string
  ad_soyad: string
  tckn: string
  sicil_no: string
  unvan: string
  mudurluk: string
  ogrenci_ad_soyad: string
  baslayacagi_sinif: string
  paragraflar: string[]
}

export function okulaUyumIzinBelgeAlanlari(
  p: {
    sicil_no?: string | null
    ad_soyad: string
    tckn?: string | null
    unvan: string
    mudurluk: string
    ogrenci_ad_soyad: string
    baslayacagi_sinif: string
  },
  tarih: string = okulaUyumIzinTarihFormat(),
): OkulaUyumIzinBelgeAlanlari {
  const sicil_no = String(p.sicil_no ?? '').trim()
  const unvan = String(p.unvan ?? '').trim()
  const mudurluk = String(p.mudurluk ?? '').trim()

  return {
    tarih,
    ad_soyad: String(p.ad_soyad ?? '').trim(),
    tckn: String(p.tckn ?? '').trim(),
    sicil_no,
    unvan,
    mudurluk,
    ogrenci_ad_soyad: String(p.ogrenci_ad_soyad ?? '').trim(),
    baslayacagi_sinif: String(p.baslayacagi_sinif ?? '').trim(),
    paragraflar: okulaUyumIzinParagraflar({ sicil_no, unvan, mudurluk }),
  }
}

export function okulaUyumSinifGecerliMi(v: string): v is OkulaUyumSinif {
  return (OKULA_UYUM_SINIF_SECENEKLERI as readonly string[]).includes(v)
}
