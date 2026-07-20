import {
  BILDIRIM_BIRIM,
  BILDIRIM_MAKAM,
  bildirimTarihFormat,
  bildirimTarihParse,
} from '@/lib/bildirim-belge-ortak'

export const MEHIL_IZNI_MAKAM = BILDIRIM_MAKAM
export const MEHIL_IZNI_BIRIM = BILDIRIM_BIRIM

export const MEHIL_IZNI_GUN_SAYISI = 15

export function mehilIzniTarihFormat(d: Date = new Date()): string {
  return bildirimTarihFormat(d)
}

/** Mehil bitiş = başlangıç + 15 gün. */
export function mehilIzniBitisTarihiHesapla(baslangic: Date): Date {
  const d = new Date(baslangic)
  d.setDate(d.getDate() + MEHIL_IZNI_GUN_SAYISI)
  return d
}

export function mehilIzniMetinOlustur(p: {
  geldigi_kurum: string
  nakil_tarihi: string
  mehil_baslangic_tarihi: string
  mehil_bitis_tarihi: string
}): string {
  const kurum = String(p.geldigi_kurum ?? '').trim()
  const nakil = mehilIzniTarihGoster(p.nakil_tarihi)
  const bas = mehilIzniTarihGoster(p.mehil_baslangic_tarihi)
  const bit = mehilIzniTarihGoster(p.mehil_bitis_tarihi)

  return (
    `${kurum}'nde çalışmakta iken nakil yoluyla ${nakil} tarihinde Belediyeniz bünyesinde ` +
    `çalışmak üzere atamam yapılmıştır. 657 sayılı Devlet Memurları Kanunu'nun 62. Maddesi gereğince ` +
    `${bas} – ${bit} tarihleri arasında ${MEHIL_IZNI_GUN_SAYISI} günlük mehil süresini kullanmak istiyorum. ` +
    `Gereğini bilgilerinize arz ederim.`
  )
}

export function mehilIzniTarihGoster(raw: string | Date | null | undefined): string {
  if (raw instanceof Date) return mehilIzniTarihFormat(raw)
  const s = String(raw ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = bildirimTarihParse(s)
    return d ? mehilIzniTarihFormat(d) : s
  }
  return s
}

export interface MehilIzniBelgeAlanlari {
  tarih: string
  ad_soyad: string
  tckn: string
  sicil_no: string
  geldigi_kurum: string
  nakil_tarihi: string
  mehil_baslangic_tarihi: string
  mehil_bitis_tarihi: string
  metin: string
}

export function mehilIzniBelgeAlanlari(
  p: {
    sicil_no?: string | null
    ad_soyad: string
    tckn?: string | null
    geldigi_kurum: string
    nakil_tarihi: string
    mehil_baslangic_tarihi: string
    mehil_bitis_tarihi: string
  },
  tarih: string = mehilIzniTarihFormat(),
): MehilIzniBelgeAlanlari {
  const geldigi_kurum = String(p.geldigi_kurum ?? '').trim()
  const nakil_tarihi = mehilIzniTarihGoster(p.nakil_tarihi)
  const mehil_baslangic_tarihi = mehilIzniTarihGoster(p.mehil_baslangic_tarihi)
  const mehil_bitis_tarihi = mehilIzniTarihGoster(p.mehil_bitis_tarihi)

  return {
    tarih,
    ad_soyad: String(p.ad_soyad ?? '').trim(),
    tckn: String(p.tckn ?? '').trim(),
    sicil_no: String(p.sicil_no ?? '').trim(),
    geldigi_kurum,
    nakil_tarihi,
    mehil_baslangic_tarihi,
    mehil_bitis_tarihi,
    metin: mehilIzniMetinOlustur({
      geldigi_kurum,
      nakil_tarihi: p.nakil_tarihi,
      mehil_baslangic_tarihi: p.mehil_baslangic_tarihi,
      mehil_bitis_tarihi: p.mehil_bitis_tarihi,
    }),
  }
}
