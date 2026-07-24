import {
  BILDIRIM_BIRIM,
  BILDIRIM_MAKAM,
  bildirimTarihFormat,
} from '@/lib/bildirim-belge-ortak'
import { trNormalize } from '@/lib/turkce-search'

export const CALISMA_BELGESI_MAKAM = BILDIRIM_MAKAM
export const CALISMA_BELGESI_BIRIM = BILDIRIM_BIRIM

export function calismaBelgesiTarihFormat(d: Date = new Date()): string {
  return bildirimTarihFormat(d)
}

function mudurlukBelgede(mudurluk: string): string {
  const ad = mudurluk.trim()
  if (!ad) return 'Belediyenizde'
  const n = trNormalize(ad)
  if (n.includes('mudurlugu') || n.endsWith('mudurluk')) return `${ad}'nde`
  return `${ad} Müdürlüğü'nde`
}

export function calismaBelgesiMetinOlustur(p: {
  sicil_no: string
  unvan: string
  mudurluk: string
}): string {
  const sicil = String(p.sicil_no ?? '').trim()
  const unvan = String(p.unvan ?? '').trim()
  const mud = mudurlukBelgede(p.mudurluk)

  return (
    `Belediyenizde ${sicil} sicil numarası ile ${unvan} olarak ${mud} çalışmaktayım. ` +
    `Tarafıma kurumunuzda çalıştığıma dair Çalışma Belgesinin verilmesi hususunda gereğini arz ederim.`
  )
}

export interface CalismaBelgesiBelgeAlanlari {
  tarih: string
  ad_soyad: string
  tckn: string
  sicil_no: string
  unvan: string
  mudurluk: string
  metin: string
}

export function calismaBelgesiBelgeAlanlari(
  p: {
    sicil_no?: string | null
    ad_soyad: string
    tckn?: string | null
    unvan: string
    mudurluk: string
  },
  tarih: string = calismaBelgesiTarihFormat(),
): CalismaBelgesiBelgeAlanlari {
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
    metin: calismaBelgesiMetinOlustur({ sicil_no, unvan, mudurluk }),
  }
}
