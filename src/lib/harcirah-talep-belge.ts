import { BILDIRIM_BIRIM, BILDIRIM_MAKAM, bildirimTarihFormat, bildirimTarihParse } from '@/lib/bildirim-belge-ortak'

export const HARCIRAH_TALEP_MAKAM = BILDIRIM_MAKAM
export const HARCIRAH_TALEP_BIRIM = BILDIRIM_BIRIM
export const HARCIRAH_ADRES_ETIKET = 'Adres:'

export function harcirahTalepTarihFormat(d: Date = new Date()): string {
  return bildirimTarihFormat(d)
}

export function harcirahTalepMetinOlustur(p: {
  geldigi_kurum: string
  nakil_tarihi: string
}): string {
  const kurum = String(p.geldigi_kurum ?? '').trim()
  const nakil = harcirahTalepTarihGoster(p.nakil_tarihi)

  return (
    `${kurum}'nda çalışmaktayken ${nakil} tarihinde Belediyenize nakil oldum. ` +
    `6245 sayılı Harcırah Kanunu'na istinaden sürekli görev yolluğunun banka hesabıma yatırılmasını arz ederim.`
  )
}

export function harcirahTalepTarihGoster(raw: string | Date | null | undefined): string {
  if (raw instanceof Date) return harcirahTalepTarihFormat(raw)
  const s = String(raw ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = bildirimTarihParse(s)
    return d ? harcirahTalepTarihFormat(d) : s
  }
  return s
}

export interface HarcirahTalepBelgeAlanlari {
  tarih: string
  ad_soyad: string
  tckn: string
  adres: string
  sicil_no: string
  geldigi_kurum: string
  nakil_tarihi: string
  metin: string
}

export function harcirahTalepBelgeAlanlari(
  p: {
    sicil_no?: string | null
    ad_soyad: string
    tckn?: string | null
    adres?: string | null
    geldigi_kurum: string
    nakil_tarihi: string
  },
  tarih: string = harcirahTalepTarihFormat(),
): HarcirahTalepBelgeAlanlari {
  const geldigi_kurum = String(p.geldigi_kurum ?? '').trim()
  const nakil_tarihi = harcirahTalepTarihGoster(p.nakil_tarihi)

  return {
    tarih,
    ad_soyad: String(p.ad_soyad ?? '').trim(),
    tckn: String(p.tckn ?? '').trim(),
    adres: String(p.adres ?? '').trim(),
    sicil_no: String(p.sicil_no ?? '').trim(),
    geldigi_kurum,
    nakil_tarihi,
    metin: harcirahTalepMetinOlustur({ geldigi_kurum, nakil_tarihi: p.nakil_tarihi }),
  }
}
