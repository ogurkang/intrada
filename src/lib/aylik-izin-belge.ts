import {
  BILDIRIM_BIRIM,
  BILDIRIM_MAKAM,
  bildirimTarihFormat,
  bildirimTarihParse,
} from '@/lib/bildirim-belge-ortak'
import { trNormalize } from '@/lib/turkce-search'

export const AYLIK_IZIN_MAKAM = BILDIRIM_MAKAM
export const AYLIK_IZIN_BIRIM = BILDIRIM_BIRIM

export function aylikIzinTarihFormat(d: Date = new Date()): string {
  return bildirimTarihFormat(d)
}

export function aylikIzinTarihGoster(raw: string | Date | null | undefined): string {
  if (raw instanceof Date) return aylikIzinTarihFormat(raw)
  const s = String(raw ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = bildirimTarihParse(s)
    return d ? aylikIzinTarihFormat(d) : s
  }
  return s
}

function mudurlukBelgede(mudurluk: string): string {
  const ad = mudurluk.trim()
  if (!ad) return 'Belediyenizde'
  const n = trNormalize(ad)
  if (n.includes('mudurlugu') || n.endsWith('mudurluk')) return `${ad}'nde`
  return `${ad} Müdürlüğü'nde`
}

export function aylikIzinMetinOlustur(p: {
  sicil_no: string
  unvan: string
  mudurluk: string
  baslangic_tarihi: string
  bitis_tarihi: string
}): string {
  const sicil = String(p.sicil_no ?? '').trim()
  const unvan = String(p.unvan ?? '').trim()
  const mud = mudurlukBelgede(p.mudurluk)
  const bas = aylikIzinTarihGoster(p.baslangic_tarihi)
  const bit = aylikIzinTarihGoster(p.bitis_tarihi)

  return (
    `Belediyenizde ${sicil} sicil numarası ile ${unvan} olarak ${mud} çalışmaktayım. ` +
    `657 sayılı Devlet Memurları Kanunu'nun 108. Maddesine istinaden ${bas} – ${bit} ` +
    `tarihleri arasında aylık izin kullanmak istiyorum. Gereğini arz ederim.`
  )
}

export interface AylikIzinBelgeAlanlari {
  tarih: string
  ad_soyad: string
  tckn: string
  sicil_no: string
  unvan: string
  mudurluk: string
  baslangic_tarihi: string
  bitis_tarihi: string
  metin: string
}

export function aylikIzinBelgeAlanlari(
  p: {
    sicil_no?: string | null
    ad_soyad: string
    tckn?: string | null
    unvan: string
    mudurluk: string
    baslangic_tarihi: string
    bitis_tarihi: string
  },
  tarih: string = aylikIzinTarihFormat(),
): AylikIzinBelgeAlanlari {
  const sicil_no = String(p.sicil_no ?? '').trim()
  const unvan = String(p.unvan ?? '').trim()
  const mudurluk = String(p.mudurluk ?? '').trim()
  const baslangic_tarihi = aylikIzinTarihGoster(p.baslangic_tarihi)
  const bitis_tarihi = aylikIzinTarihGoster(p.bitis_tarihi)

  return {
    tarih,
    ad_soyad: String(p.ad_soyad ?? '').trim(),
    tckn: String(p.tckn ?? '').trim(),
    sicil_no,
    unvan,
    mudurluk,
    baslangic_tarihi,
    bitis_tarihi,
    metin: aylikIzinMetinOlustur({
      sicil_no,
      unvan,
      mudurluk,
      baslangic_tarihi: p.baslangic_tarihi,
      bitis_tarihi: p.bitis_tarihi,
    }),
  }
}
