import {
  BILDIRIM_BIRIM,
  BILDIRIM_MAKAM,
  bildirimTarihFormat,
  bildirimTarihParse,
} from '@/lib/bildirim-belge-ortak'
import { trNormalize } from '@/lib/turkce-search'

export const YZC_MAKAM = BILDIRIM_MAKAM
export const YZC_BIRIM = BILDIRIM_BIRIM

export const YZC_GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'] as const
export type YzcGun = (typeof YZC_GUNLER)[number]

/** Öğle arası 12:30–13:30 hariç yarım saatlik dilimler. */
export const YZC_SAATLER = [
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
] as const

export type YzcSaat = (typeof YZC_SAATLER)[number]
export type YzcCalismaProgrami = Partial<Record<YzcGun, YzcSaat[]>>

export const YZC_ACIKLAMALAR = [
  'Hizmet ihtiyacı ve memurun talebi dikkate alınarak, memurun haftalık yarım zamanlı çalışacağı günleri ve çalışma saatleri, ilgili yönetmeliğin 9. maddede belirtilen hususlara uygun olarak yetkili amir tarafından belirlenir.',
  'Yarım zamanlı çalışma hakkından yararlanan memurun haftalık çalışma süresi, normal çalışma süresinin yarısı olarak düzenlenir.',
  'Haftalık çalışma günü 3 günden az olamaz.',
  'Günlük 3 saatten az ve 8 saatten fazla çalışamaz.',
  'Memur, ilgili mevzuat gereğince tespit edilen günlük normal çalışmanın başlama ve bitiş saatleri dışında ve öğle dinlenme süresinde çalışamaz.',
  'Memur, süt izni hariç olmak üzere mazeret izinleri, 657 Sayılı Kanun\'da belirtilen süre kadar kullanılır.',
  'Kadın memura ayrıca süt izni verilemez.',
  'Yetkili amir, hizmet ihtiyacına veya memurun talebine göre haftalık yarım zamanlı çalışma gün ve saatlerinde, Ocak ve temmuz aylarında olmak üzere yılda iki defa değişiklik yapabilir.',
  'Memur, aylıksız izin hariç olmak üzere, yarı zamanlı çalışma dönemi içinde kalan yıllık izin, hastalık izni, mazeret izni ve diğer izinlerde geçen süreler ile yarım zamanlı çalışma dönemi içinde kalan ulusal bayram ve genel tatil günlerinde yarım zamanlı çalışmış sayılır.',
] as const

export function yzcTarihFormat(d: Date = new Date()): string {
  return bildirimTarihFormat(d)
}

export function yzcTarihGoster(raw: string | Date | null | undefined): string {
  if (raw instanceof Date) return yzcTarihFormat(raw)
  const s = String(raw ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = bildirimTarihParse(s)
    return d ? yzcTarihFormat(d) : s
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

export function yzcCalismaProgramiNormalize(raw: unknown): YzcCalismaProgrami {
  const src = (raw ?? {}) as Record<string, unknown>
  const out: YzcCalismaProgrami = {}
  for (const gun of YZC_GUNLER) {
    const list = src[gun]
    if (!Array.isArray(list)) continue
    const saatler = list
      .map(s => String(s).trim())
      .filter((s): s is YzcSaat => (YZC_SAATLER as readonly string[]).includes(s))
    if (saatler.length) out[gun] = [...new Set(saatler)]
  }
  return out
}

export function yzcMetinOlustur(p: {
  sicil_no: string
  unvan: string
  mudurluk: string
  cocuk_dogum_tarihi: string
}): string {
  const sicil = String(p.sicil_no ?? '').trim()
  const unvan = String(p.unvan ?? '').trim()
  const mud = mudurlukBelgede(p.mudurluk)
  const dogum = yzcTarihGoster(p.cocuk_dogum_tarihi)

  return (
    `Belediyenizde ${sicil} sicil numarası ile ${unvan} olarak ${mud} çalışmaktayım. ` +
    `657 sayılı Devlet Memurları Kanunu'nun Eki 43. Maddesine istinaden ${dogum} tarihinde doğum yaptığımdan ` +
    `ekte yer alan yarı zamanlı çalışma formundaki tarihlerde doğum sonrası yarım zamanlı çalışmak istiyorum.`
  )
}

export interface YzcBelgeAlanlari {
  tarih: string
  ad_soyad: string
  tckn: string
  sicil_no: string
  unvan: string
  mudurluk: string
  cocuk_dogum_tarihi: string
  yari_zamanli_baslangic_tarihi: string
  normal_zamanli_donus_tarihi: string
  calisma_programi: YzcCalismaProgrami
  metin: string
}

export function yzcBelgeAlanlari(
  p: {
    sicil_no?: string | null
    ad_soyad: string
    tckn?: string | null
    unvan: string
    mudurluk: string
    cocuk_dogum_tarihi: string
    yari_zamanli_baslangic_tarihi: string
    normal_zamanli_donus_tarihi: string
    calisma_programi: YzcCalismaProgrami
  },
  tarih: string = yzcTarihFormat(),
): YzcBelgeAlanlari {
  const sicil_no = String(p.sicil_no ?? '').trim()
  const unvan = String(p.unvan ?? '').trim()
  const mudurluk = String(p.mudurluk ?? '').trim()
  const calisma_programi = yzcCalismaProgramiNormalize(p.calisma_programi)

  return {
    tarih,
    ad_soyad: String(p.ad_soyad ?? '').trim(),
    tckn: String(p.tckn ?? '').trim(),
    sicil_no,
    unvan,
    mudurluk,
    cocuk_dogum_tarihi: yzcTarihGoster(p.cocuk_dogum_tarihi),
    yari_zamanli_baslangic_tarihi: yzcTarihGoster(p.yari_zamanli_baslangic_tarihi),
    normal_zamanli_donus_tarihi: yzcTarihGoster(p.normal_zamanli_donus_tarihi),
    calisma_programi,
    metin: yzcMetinOlustur({
      sicil_no,
      unvan,
      mudurluk,
      cocuk_dogum_tarihi: p.cocuk_dogum_tarihi,
    }),
  }
}

export function yzcProgramGunSayisi(program: YzcCalismaProgrami): number {
  return YZC_GUNLER.filter(g => (program[g]?.length ?? 0) > 0).length
}
