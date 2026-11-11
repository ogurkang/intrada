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

/**
 * Sınır noktaları: 08:30–12:30 ve 13:30–17:30.
 * Tek işaret süre vermez; ardışık iki nokta arası 30 dk’dır (ör. 08:30+09:00 → 30 dk, 08:30+09:30 → 1 saat).
 */
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

const YZC_OGLE_SONRA_IDX = YZC_SAATLER.indexOf('13:30')

function yzcSaatDakika(saat: string): number {
  const [h, m] = saat.split(':').map(n => Number(n))
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
}

function yzcDakikaSaat(dk: number): string {
  const h = Math.floor(dk / 60)
  const m = dk % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Aynı yarım içinde (öğle öncesi / sonrası) seçilen sınırların min–max aralığı → 30 dk dilim sayısı. */
export function yzcGunDilimSayisi(saatler: readonly string[] | null | undefined): number {
  const idxs = [...new Set(
    (saatler ?? [])
      .map(s => YZC_SAATLER.indexOf(s as YzcSaat))
      .filter(i => i >= 0),
  )].sort((a, b) => a - b)
  if (idxs.length < 2) return 0
  const sabah = idxs.filter(i => i < YZC_OGLE_SONRA_IDX)
  const ogleden = idxs.filter(i => i >= YZC_OGLE_SONRA_IDX)
  let dilim = 0
  for (const grup of [sabah, ogleden]) {
    if (grup.length < 2) continue
    dilim += grup[grup.length - 1] - grup[0]
  }
  return dilim
}

/**
 * Eski model (her kutu = 30 dk dilim) kayıtlarını sınır noktasına çevirir.
 * Örn. 08:30…12:00 → …+12:30; 13:30…17:00 → …+17:30.
 */
function yzcEskiDilimleriSiniraCevir(saatler: string[]): YzcSaat[] {
  const gecerli = saatler
    .map(s => String(s).trim())
    .filter((s): s is YzcSaat => (YZC_SAATLER as readonly string[]).includes(s))
  if (gecerli.length === 0) return []
  const dklar = [...new Set(gecerli.map(yzcSaatDakika))].sort((a, b) => a - b)
  const out = new Set<number>(dklar)
  let runBas = dklar[0]
  let prev = dklar[0]
  for (let i = 1; i < dklar.length; i += 1) {
    const cur = dklar[i]
    if (cur !== prev + 30) {
      const bitis = prev + 30
      if ((YZC_SAATLER as readonly string[]).includes(yzcDakikaSaat(bitis))) out.add(bitis)
      runBas = cur
    }
    prev = cur
  }
  const sonBitis = prev + 30
  if ((YZC_SAATLER as readonly string[]).includes(yzcDakikaSaat(sonBitis))) out.add(sonBitis)
  void runBas
  return [...out]
    .sort((a, b) => a - b)
    .map(yzcDakikaSaat)
    .filter((s): s is YzcSaat => (YZC_SAATLER as readonly string[]).includes(s))
}

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
  const sinirSurum = Number(src._sinir) === 1 || src._sinir === true
  const out: YzcCalismaProgrami = {}
  for (const gun of YZC_GUNLER) {
    const list = src[gun]
    if (!Array.isArray(list)) continue
    let saatler = list
      .map(s => String(s).trim())
      .filter((s): s is YzcSaat => (YZC_SAATLER as readonly string[]).includes(s))
    if (!sinirSurum && saatler.length) {
      // Eski kayıt: kutular dilimdi; bitiş sınırını ekle (12:30 / 17:30 dahil).
      saatler = yzcEskiDilimleriSiniraCevir(saatler)
    }
    if (saatler.length) out[gun] = [...new Set(saatler)].sort(
      (a, b) => YZC_SAATLER.indexOf(a) - YZC_SAATLER.indexOf(b),
    )
  }
  return out
}

/** Kayıt / form için sınır modeli sürümüyle birlikte yaz. */
export function yzcCalismaProgramiKaydet(program: YzcCalismaProgrami): Record<string, unknown> {
  const temiz = yzcCalismaProgramiNormalize({ ...program, _sinir: 1 })
  return { ...temiz, _sinir: 1 }
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
  /** Görev müdürlüğünün müdürü (ek imza sağ kolon). */
  mudur_ad_soyad: string
  mudur_unvan: string
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
    mudur_ad_soyad?: string | null
    mudur_unvan?: string | null
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
    mudur_ad_soyad: String(p.mudur_ad_soyad ?? '').trim(),
    mudur_unvan: String(p.mudur_unvan ?? '').trim(),
  }
}

export function yzcProgramGunSayisi(program: YzcCalismaProgrami): number {
  return YZC_GUNLER.filter(g => (program[g]?.length ?? 0) > 0).length
}

/** İki sınır noktası arası 30 dakikadır. */
export const YZC_DILIM_SAAT = 0.5
export const YZC_MIN_GUN = 3
export const YZC_MIN_GUNLUK_SAAT = 3
export const YZC_MAX_GUNLUK_SAAT = 8
export const YZC_HEDEF_HAFTALIK_SAAT = 20
export const YZC_MAX_DILIM = YZC_HEDEF_HAFTALIK_SAAT / YZC_DILIM_SAAT

export function yzcProgramMaxDilimeUlasti(program: YzcCalismaProgrami): boolean {
  return yzcProgramDilimSayisi(program) >= YZC_MAX_DILIM
}

export function yzcProgramDilimSayisi(program: YzcCalismaProgrami): number {
  let n = 0
  for (const gun of YZC_GUNLER) {
    n += yzcGunDilimSayisi(program[gun])
  }
  return n
}

export function yzcProgramToplamSaat(program: YzcCalismaProgrami): number {
  return yzcProgramDilimSayisi(program) * YZC_DILIM_SAAT
}

export type YzcProgramGunOzeti = { gun: YzcGun; dilim: number; saat: number }

export function yzcProgramGunlukOzet(program: YzcCalismaProgrami): YzcProgramGunOzeti[] {
  return YZC_GUNLER.filter(g => (program[g]?.length ?? 0) > 0).map(gun => {
    const dilim = yzcGunDilimSayisi(program[gun])
    return { gun, dilim, saat: dilim * YZC_DILIM_SAAT }
  })
}

export type YzcProgramDogrulama = {
  gunSayisi: number
  toplamSaat: number
  gunlukOzet: YzcProgramGunOzeti[]
  hatalar: string[]
  gecerli: boolean
}

export function yzcProgramDogrula(program: YzcCalismaProgrami): YzcProgramDogrulama {
  const gunlukOzet = yzcProgramGunlukOzet(program)
  const gunSayisi = gunlukOzet.filter(g => g.dilim > 0).length
  const toplamSaat = yzcProgramToplamSaat(program)
  const hatalar: string[] = []

  if (gunSayisi < YZC_MIN_GUN) {
    hatalar.push(`Haftalık çalışma günü en az ${YZC_MIN_GUN} olmalıdır (şu an: ${gunSayisi}).`)
  }
  for (const { gun, saat, dilim } of gunlukOzet) {
    if (dilim <= 0) {
      hatalar.push(`${gun}: tek sınır noktası süre oluşturmaz; bitiş saati de seçilmelidir.`)
      continue
    }
    if (saat < YZC_MIN_GUNLUK_SAAT) {
      hatalar.push(`${gun} günü en az ${YZC_MIN_GUNLUK_SAAT} saat seçilmelidir (şu an: ${saat} saat).`)
    }
    if (saat > YZC_MAX_GUNLUK_SAAT) {
      hatalar.push(`${gun} günü en fazla ${YZC_MAX_GUNLUK_SAAT} saat olabilir (şu an: ${saat} saat).`)
    }
  }
  if (toplamSaat !== YZC_HEDEF_HAFTALIK_SAAT) {
    hatalar.push(
      `Haftalık toplam çalışma süresi tam ${YZC_HEDEF_HAFTALIK_SAAT} saat olmalıdır (şu an: ${toplamSaat} saat).`,
    )
  }

  return { gunSayisi, toplamSaat, gunlukOzet, hatalar, gecerli: hatalar.length === 0 }
}
