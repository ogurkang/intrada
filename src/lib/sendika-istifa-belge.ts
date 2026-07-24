import {
  BILDIRIM_BIRIM,
  BILDIRIM_MAKAM,
  bildirimTarihFormat,
} from '@/lib/bildirim-belge-ortak'

export const SENDIKA_ISTIFA_MAKAM = BILDIRIM_MAKAM
export const SENDIKA_ISTIFA_BIRIM = BILDIRIM_BIRIM

export function sendikaIstifaTarihFormat(d: Date = new Date()): string {
  return bildirimTarihFormat(d)
}

export function sendikaIstifaMetinOlustur(sendikaAdi: string): string {
  const sendika = String(sendikaAdi ?? '').trim()
  return (
    `4688 sayılı Sendikalar Yasası kapsamında ${sendika} üyesiyim. ` +
    'Gördüğüm lüzum üzerinde üyesi olduğum sendikamdan istifa ettiğime dair işlemlerin yürütülmesi hususunda gereğini arz ederim.'
  )
}

export interface SendikaIstifaBelgeAlanlari {
  tarih: string
  ad_soyad: string
  tckn: string
  sicil_no: string
  sendika_adi: string
  metin: string
}

export function sendikaIstifaBelgeAlanlari(
  p: {
    sicil_no?: string | null
    ad_soyad: string
    tckn?: string | null
    sendika_adi: string
  },
  tarih: string = sendikaIstifaTarihFormat(),
): SendikaIstifaBelgeAlanlari {
  const sendika_adi = String(p.sendika_adi ?? '').trim()
  return {
    tarih,
    ad_soyad: String(p.ad_soyad ?? '').trim(),
    tckn: String(p.tckn ?? '').trim(),
    sicil_no: String(p.sicil_no ?? '').trim(),
    sendika_adi,
    metin: sendikaIstifaMetinOlustur(sendika_adi),
  }
}
