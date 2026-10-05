/**
 * Aylıktan kesme bordrosu.
 * Kesinti, bordrodaki üstü çizili olmayan aylık unsurlarına uygulanır.
 * Sosyal denge tazminatı da aynı orana girer: tutar karşılığı, kesinti tutarın paydasıdır.
 */
import {
  EN_YUKSEK_DEVLET_MEMURU_GOSTERGE,
  SDS_TAVAN_YUZDE,
  SEYYANEN_ILAVE_GOSTERGE,
} from '@/lib/ayliktan-kesme-katsayi'

/** Derece 1–15, kademe 1–9. Sıfır: o kademe gösterge tablosunda yok. */
const GOSTERGE: readonly (readonly number[])[] = [
  [1320, 1380, 1440, 1500, 0, 0, 0, 0, 0],
  [1155, 1210, 1265, 1320, 1380, 1440, 0, 0, 0],
  [1020, 1065, 1110, 1155, 1210, 1265, 1320, 1380, 0],
  [915, 950, 985, 1020, 1065, 1110, 1155, 1210, 1265],
  [835, 865, 895, 915, 950, 985, 1020, 1065, 1110],
  [760, 785, 810, 835, 865, 895, 915, 950, 985],
  [705, 720, 740, 760, 785, 810, 835, 865, 895],
  [660, 675, 690, 705, 720, 740, 760, 785, 810],
  [620, 630, 645, 660, 675, 690, 705, 720, 740],
  [590, 600, 610, 620, 630, 645, 660, 675, 690],
  [560, 570, 580, 590, 600, 610, 620, 630, 645],
  [545, 550, 555, 560, 570, 580, 590, 600, 610],
  [530, 535, 540, 545, 550, 555, 560, 570, 580],
  [515, 520, 525, 530, 535, 540, 545, 550, 555],
  [500, 505, 510, 515, 520, 525, 530, 535, 540],
]

/** Şablondaki ceza oranları: 1/30 … 1/8, ardından 1/4 ve 1/2. */
export const AYLIKTAN_KESME_PAYDALARI = [
  30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 4, 2,
] as const

export type AyliktanKesmePayda = (typeof AYLIKTAN_KESME_PAYDALARI)[number]

export type AyliktanKesmeKaynak = {
  sicil_no: string
  ad_soyad: string
  tckn: string
  unvan: string
  derece: number
  kademe: number
  ek_gosterge: number
  oht_orani: number
  /** Asıl terfi kaydındaki yan ödeme. */
  yan_odeme_gostergesi: number
  /** 375 sayılı KHK ek md. 9 oranı. */
  ek_odeme_orani?: number
  /** Terfi kaydındaki SDS puanı; boşsa kazanç tanımı. Yüzde olarak kullanılır. */
  sds_puan?: number
  sds_kaynak?: 'terfi' | 'kazanc' | 'yok'
  kidem_yili: number
  mudurluk: string
  /** Yönetmelik m.12: ödeme unsurlarının yarısı bu bordroda esas alındı. */
  yarim_zamanli: boolean
  /** Yarı zamanlı kayıt var ama yarı ödeme henüz başlamadıysa açıklama. */
  yarim_zamanli_not: string | null
}

export type AyliktanKesmeKatsayi = {
  maas: number
  tabanAylik: number
  yanOdeme: number
  payda: AyliktanKesmePayda
}

export type AyliktanKesmeSatir = {
  ad: string
  tutar: number
  kesinti: number
}

export type AyliktanKesmeSosyalDenge = {
  puan: number
  kaynak: 'terfi' | 'kazanc' | 'yok'
  /** Aylık sosyal denge karşılığı. Yarı zamanlıda ödeme unsurunun yarısı. */
  aylik: number
  /** Diğer maaş unsurları gibi: karşılık × 1/payda. */
  kesinti?: number
  iki_ay: number
  tavan: number
  tavan_asildi: boolean
  cumle: string
}

export type AyliktanKesmeBordro = {
  kaynak: AyliktanKesmeKaynak
  katsayi: AyliktanKesmeKatsayi
  gosterge: number
  satirlar: AyliktanKesmeSatir[]
  /** Oranlı maaş unsurlarının kesinti toplamı. Sosyal denge buna girmez. */
  toplam: number
  /** Aylıktan ceza kesintisi + sosyal denge kesintisi. */
  genel_toplam?: number
  yarim_zamanli: boolean
  sosyal_denge?: AyliktanKesmeSosyalDenge
}

export const YARIM_ZAMANLI_CUMLE =
  'Devlet Memurlarının Yarım Zamanlı Çalışma Hakkının Kullanımına İlişkin Yönetmelik hükümleri dikkate alınmıştır.'

export function ayliktanKesmeDayanakMetni(yarimZamanli: boolean): string {
  const satirlar = [
    'Bu hesaplama aşağıdaki hükümlere göre hesaplanmıştır.',
    'a) 657 sayılı Devlet Memurları Kanunu\'nun 147. maddesinde yer alan "Aylık: Bu Kanuna tabi kurumlarda görevlendirilen memurlara hizmetlerinin karşılığında, kadroya dayanılarak ay itibariyle ödenen parayı" ifadesi ile Hazine ve Maliye Bakanlığı\'nın görüşleri',
    'b) Adapazarı Belediye Başkanlığı ile BEM-BİR-SEN arasında imzalanan 2026-2027 yıllarını kapsayan Sosyal Denge Tazminatı Sözleşmesi\'nin 13. Maddesinin (c) fıkrasında yer alan "aylıktan kesme cezası alınması halinde 2 ay süreyle sosyal denge tazminatı kesilir ve ödenmez" ifadesi',
  ]
  if (yarimZamanli) satirlar.push(`c) ${YARIM_ZAMANLI_CUMLE}`)
  return satirlar.join('\n')
}

function yerelGun(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const gun = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${gun}`
}

/**
 * Yönetmelik m.12: yarım zamanlı çalışmaya başlanan tarihi izleyen ay başından
 * itibaren her ödeme unsurunun yarısı esas alınır. Bitiş günü geçmişse uygulanmaz.
 */
export function yarimZamanliOdemeDurumu(
  gorevTuru: string | null | undefined,
  baslangic: string | null | undefined,
  bitis: string | null | undefined,
  bugun = new Date(),
): { uygulanir: boolean; not: string | null } {
  if (String(gorevTuru ?? '').trim() !== 'Yarı Zamanlı') return { uygulanir: false, not: null }
  const t = yerelGun(bugun)
  const bit = String(bitis ?? '').slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(bit) && bit < t) {
    return { uygulanir: false, not: 'Yarı zamanlı çalışma bitiş tarihi geçtiği için tam tutar esas alındı.' }
  }
  const bas = String(baslangic ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bas)) {
    return { uygulanir: true, not: null }
  }
  const [y, m] = bas.split('-').map(Number)
  const izleyenAyBasi = yerelGun(new Date(y, m, 1))
  if (t < izleyenAyBasi) {
    return {
      uygulanir: false,
      not: 'Yarı zamanlı çalışma kaydı var. Yönetmelik, ödemeyi başlangıcı izleyen ay başından itibaren yarıya indirir; bu tarihte henüz uygulanmıyor.',
    }
  }
  return { uygulanir: true, not: null }
}

export function ayliktanKesmePaydaMi(n: number): n is AyliktanKesmePayda {
  return (AYLIKTAN_KESME_PAYDALARI as readonly number[]).includes(n)
}

export function gostergeBul(derece: number, kademe: number): number | null {
  if (!Number.isInteger(derece) || !Number.isInteger(kademe)) return null
  if (derece < 1 || derece > 15 || kademe < 1 || kademe > 9) return null
  const deger = GOSTERGE[derece - 1][kademe - 1]
  return deger > 0 ? deger : null
}

/** Excel ROUND: pozitif sayıda yarım yukarı. */
export function excelRound2(n: number): number {
  return Math.round(Number((n * 100).toFixed(8))) / 100
}

export function paraTr(n: number): string {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

export function katsayiTr(n: number): string {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 6 }).format(n)
}

export function sayiOku(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '')
  if (!t) return null
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  const n = Number(normalized)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

export function ayliktanKesmeHesapla(
  kaynak: AyliktanKesmeKaynak,
  katsayi: AyliktanKesmeKatsayi,
): AyliktanKesmeBordro | { hata: string } {
  const gosterge = gostergeBul(kaynak.derece, kaynak.kademe)
  if (gosterge == null) {
    return {
      hata: `Derece ${kaynak.derece} kademe ${kaynak.kademe} için gösterge tablosunda değer yok.`,
    }
  }
  if (katsayi.maas <= 0 || katsayi.tabanAylik <= 0 || katsayi.yanOdeme <= 0) {
    return { hata: 'Katsayılar sıfırdan büyük olmalıdır.' }
  }
  if (!ayliktanKesmePaydaMi(katsayi.payda)) {
    return { hata: 'Kesilecek ceza oranı listede yok.' }
  }

  const oran = 1 / katsayi.payda
  const kidemYili = Math.min(Math.max(kaynak.kidem_yili, 0), 25)
  const yarim = kaynak.yarim_zamanli === true
  const unsur = (n: number) => {
    const tam = excelRound2(n)
    return yarim ? excelRound2(tam / 2) : tam
  }

  const yanToplam = Math.max(kaynak.yan_odeme_gostergesi, 0)
  const ekOran = Math.max(kaynak.ek_odeme_orani ?? 0, 0)
  const eydma = EN_YUKSEK_DEVLET_MEMURU_GOSTERGE * katsayi.maas

  const aylikTutar = unsur(katsayi.maas * gosterge)
  const ekTutar = unsur(katsayi.maas * kaynak.ek_gosterge)
  const tabanTutar = unsur(katsayi.tabanAylik * 1000)
  const kidemTutar = unsur(kidemYili * 20 * katsayi.maas)
  const yanTutar = unsur(katsayi.yanOdeme * yanToplam)
  const seyyanenTutar = unsur(SEYYANEN_ILAVE_GOSTERGE * katsayi.maas)
  const ohtTutar = unsur((eydma * kaynak.oht_orani) / 100)
  const ekOdemeTutar = unsur((eydma * ekOran) / 100)

  const kalemler: Array<[string, number]> = [
    ['Maaş Gösterge Tutarı', aylikTutar],
    ['Maaş Ek Gösterge Tutarı', ekTutar],
    ['Taban Aylık', tabanTutar],
    ['Kıdem Aylık Tutarı', kidemTutar],
    ['Yan Ödeme', yanTutar],
    ['Seyyanen İlave Ödeme', seyyanenTutar],
    ['Özel Hizmet Tazminatı', ohtTutar],
    ['Ek Ödeme', ekOdemeTutar],
  ]

  const satirlar = kalemler.map(([ad, tutar]) => ({
    ad,
    tutar,
    kesinti: excelRound2(tutar * oran),
  }))
  const toplam = excelRound2(satirlar.reduce((s, r) => s + r.kesinti, 0))
  const sosyal_denge = sosyalDengeHesapla(kaynak.sds_puan ?? 0, kaynak.sds_kaynak ?? 'yok', eydma, yarim, oran)
  const genel_toplam = excelRound2(toplam + (sosyal_denge.kesinti ?? 0))

  return { kaynak, katsayi, gosterge, satirlar, toplam, genel_toplam, yarim_zamanli: yarim, sosyal_denge }
}

/** Kayıtlı bordroda kesinti yoksa, karşılık diğer satırlar gibi paydaya bölünür. */
export function bordroSdsKesintisi(
  bordro: Pick<AyliktanKesmeBordro, 'sosyal_denge' | 'katsayi'>,
): number {
  const sds = bordro.sosyal_denge
  if (!sds) return 0
  if (typeof sds.kesinti === 'number' && Number.isFinite(sds.kesinti)) return sds.kesinti
  const payda = bordro.katsayi?.payda
  if (!payda) return 0
  return excelRound2(sds.aylik / payda)
}

export function ayliktanKesmeGenelToplam(
  bordro: Pick<AyliktanKesmeBordro, 'toplam' | 'sosyal_denge' | 'katsayi'>,
): number {
  return excelRound2(bordro.toplam + bordroSdsKesintisi(bordro))
}

/** Eski kayıtta sosyal denge yoksa, güncel puanla satırı tamamlar. Yarı zaman bayrağı bordrodakidir. */
export function bordroyaSdsIsle(
  bordro: AyliktanKesmeBordro,
  puan: number,
  sdsKaynak: 'terfi' | 'kazanc' | 'yok',
): AyliktanKesmeBordro {
  const eydma = EN_YUKSEK_DEVLET_MEMURU_GOSTERGE * bordro.katsayi.maas
  const sosyal_denge = sosyalDengeHesapla(
    puan,
    sdsKaynak,
    eydma,
    bordro.yarim_zamanli === true,
    1 / bordro.katsayi.payda,
  )
  return {
    ...bordro,
    kaynak: { ...bordro.kaynak, sds_puan: puan, sds_kaynak: sdsKaynak },
    sosyal_denge,
    genel_toplam: excelRound2(bordro.toplam + (sosyal_denge.kesinti ?? 0)),
  }
}

function sosyalDengeHesapla(
  puanHam: number,
  kaynak: 'terfi' | 'kazanc' | 'yok',
  eydma: number,
  yarim: boolean,
  oran: number,
): AyliktanKesmeSosyalDenge {
  const puan = Math.max(puanHam, 0)
  const tavan = excelRound2((eydma * SDS_TAVAN_YUZDE) / 100)
  const aylikTam = excelRound2((eydma * puan) / 100)
  const aylik = yarim ? excelRound2(aylikTam / 2) : aylikTam
  const kesinti = excelRound2(aylik * oran)
  const iki_ay = excelRound2(aylik * 2)
  const tavan_asildi = puan > 0 && aylikTam > tavan
  return { puan, kaynak, aylik, kesinti, iki_ay, tavan, tavan_asildi, cumle: '' }
}
