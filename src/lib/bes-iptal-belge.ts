import {
  BILDIRIM_BIRIM,
  BILDIRIM_MAKAM,
  bildirimTarihFormat,
} from '@/lib/bildirim-belge-ortak'

export const BES_IPTAL_MAKAM = BILDIRIM_MAKAM
export const BES_IPTAL_BIRIM = BILDIRIM_BIRIM

export function besIptalTarihFormat(d: Date = new Date()): string {
  return bildirimTarihFormat(d)
}

export function besIptalMetinOlustur(): string {
  return (
    'Resmi Gazetede yayımlanarak yürürlüğe giren 4632 sayılı Kanun kapsamında maaşımdan kesinti yapılmaktadır. ' +
    'OKS\'den dolayı maaşımdan kesinti yapılmaması hususunda gereğini arz ederim.'
  )
}

export interface BesIptalBelgeAlanlari {
  tarih: string
  ad_soyad: string
  tckn: string
  sicil_no: string
  metin: string
}

export function besIptalBelgeAlanlari(
  p: { sicil_no?: string | null; ad_soyad: string; tckn?: string | null },
  tarih: string = besIptalTarihFormat(),
): BesIptalBelgeAlanlari {
  return {
    tarih,
    ad_soyad: String(p.ad_soyad ?? '').trim(),
    tckn: String(p.tckn ?? '').trim(),
    sicil_no: String(p.sicil_no ?? '').trim(),
    metin: besIptalMetinOlustur(),
  }
}
