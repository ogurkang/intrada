import { gsmNormalize } from '@/lib/sms-mesajpaketi'
import { trNormalize } from '@/lib/turkce-search'

export const SMS_EXCEL_UST_SINIR = 500
export const SMS_MESAJ_UST_SINIR = 900

const TELEFON_BASLIK = new Set(['telefon', 'gsm', 'cep', 'numara', 'tel', 'mobile', 'telefonno', 'ceptelefonu', 'ceptel'])
const MESAJ_BASLIK = new Set(['mesaj', 'metin', 'sms', 'mesajmetni'])
const AD_BASLIK = new Set(['adsoyad', 'isim', 'alici', 'ad', 'adisoyadi'])

export type SmsExcelDurum = 'hazir' | 'gecersiz_numara' | 'bos_mesaj' | 'uzun_mesaj' | 'mukerrer'

export type SmsExcelKolonSecimi = {
  telefon: number
  mesaj: number
  ad: number
  baslikSatiri: boolean
}

export type SmsExcelKolonSecenegi = {
  index: number
  harf: string
  etiket: string
}

export type SmsExcelSatir = {
  sira: number
  ad: string
  telefonHam: string
  telefon: string | null
  mesaj: string
  durum: SmsExcelDurum
  aciklama: string
}

function anahtar(s: string): string {
  return trNormalize(s).replace(/[^a-z0-9]/g, '')
}

function hucre(v: unknown): string {
  return String(v ?? '').replace(/\s+/g, ' ').trim()
}

/** Ad varsa ve metin "Sayın" ile başlamıyorsa diğer SMS ekranlarındaki hitap eklenir. */
export function smsExcelGonderimMetni(ad: string, govde: string): string {
  const g = govde.trim()
  const isim = ad.trim()
  if (!isim || !g) return g
  if (/^\s*sayın\b/i.test(g)) return g
  return `Sayın ${isim}\n${g}`
}

function kolonHarfi(index: number): string {
  let n = index + 1
  let s = ''
  while (n > 0) {
    const kalan = (n - 1) % 26
    s = String.fromCharCode(65 + kalan) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function baslikMi(satir: string[]): { telefon: number; mesaj: number; ad: number } | null {
  let telefon = -1
  let mesaj = -1
  let ad = -1
  satir.forEach((h, i) => {
    const k = anahtar(h)
    if (!k) return
    if (telefon < 0 && TELEFON_BASLIK.has(k)) telefon = i
    else if (mesaj < 0 && MESAJ_BASLIK.has(k)) mesaj = i
    else if (ad < 0 && AD_BASLIK.has(k)) ad = i
  })
  return telefon >= 0 ? { telefon, mesaj, ad } : null
}

/** Başlık birebir uymasa da sütun adından öneri üretir. Seçim yine kullanıcıdadır. */
function onerilenKolonlar(satir: string[]): { telefon: number; mesaj: number; ad: number } | null {
  const kesin = baslikMi(satir)
  if (kesin) return kesin
  const bul = (test: (k: string) => boolean) => satir.findIndex(h => test(anahtar(h)))
  const telefon = bul(k => k.includes('telefon') || k.includes('gsm') || k.includes('cep') || k === 'tel' || k === 'numara' || k === 'mobile')
  const mesaj = bul(k => k.includes('mesaj') || k.includes('metin') || k.includes('sms'))
  const ad = bul(k => k.includes('soyad') || k.includes('isim') || k === 'ad' || k === 'adi' || k === 'alici')
  if (telefon < 0 && mesaj < 0 && ad < 0) return null
  return { telefon, mesaj, ad }
}

function satirlariHazirla(hamSatirlar: unknown[][]): string[][] {
  return hamSatirlar
    .map(r => (Array.isArray(r) ? r.map(hucre) : []))
    .filter(r => r.some(Boolean))
}

/** Dosyadaki sütunları ve önerilen telefon / ad soyad / mesaj eşlemesini döner. */
export function smsExcelKolonSecenekleri(hamSatirlar: unknown[][]): {
  secenekler: SmsExcelKolonSecenegi[]
  oneri: SmsExcelKolonSecimi
} {
  const bos: SmsExcelKolonSecimi = { telefon: -1, mesaj: -1, ad: -1, baslikSatiri: false }
  const satirlarHam = satirlariHazirla(hamSatirlar)
  if (!satirlarHam.length) return { secenekler: [], oneri: bos }

  const ilk = satirlarHam[0]
  const genislik = Math.max(...satirlarHam.map(r => r.length))
  const eslesen = onerilenKolonlar(ilk)
  const baslikSatiri = Boolean(eslesen) || !ilk.some(h => gsmNormalize(h))
  const secenekler: SmsExcelKolonSecenegi[] = Array.from({ length: genislik }, (_, i) => {
    const harf = kolonHarfi(i)
    const ad = ilk[i] ?? ''
    return { index: i, harf, etiket: ad ? `${harf} — ${ad}` : harf }
  })
  return {
    secenekler,
    oneri: {
      telefon: eslesen?.telefon ?? (genislik > 0 ? 0 : -1),
      mesaj: eslesen ? eslesen.mesaj : genislik > 1 ? 1 : -1,
      ad: eslesen ? eslesen.ad : genislik > 2 ? 2 : -1,
      baslikSatiri,
    },
  }
}

/**
 * Excel satırlarından gönderim önizlemesi.
 * Sütun seçimi verilmezse başlık satırı tanınır; yoksa A=telefon, B=mesaj, C=ad.
 * Mesaj hücresi boşsa ortak mesaj kullanılır.
 */
export function smsExcelOnizleme(
  hamSatirlar: unknown[][],
  ortakMesaj: string,
  secim?: SmsExcelKolonSecimi,
): { satirlar: SmsExcelSatir[]; hata?: string } {
  const satirlarHam = satirlariHazirla(hamSatirlar)
  if (!satirlarHam.length) return { satirlar: [], hata: 'Dosyada satır yok.' }

  let kolon: { telefon: number; mesaj: number; ad: number }
  let veri: string[][]
  if (secim) {
    if (secim.telefon < 0) return { satirlar: [], hata: 'Telefon sütununu seçin.' }
    if (secim.mesaj >= 0 && secim.mesaj === secim.telefon) {
      return { satirlar: [], hata: 'Telefon ve mesaj aynı sütun olamaz.' }
    }
    if (secim.ad >= 0 && (secim.ad === secim.telefon || (secim.mesaj >= 0 && secim.ad === secim.mesaj))) {
      return { satirlar: [], hata: 'Ad soyad sütunu telefon veya mesaj ile aynı olamaz.' }
    }
    kolon = secim
    veri = secim.baslikSatiri ? satirlarHam.slice(1) : satirlarHam
  } else {
    const baslik = baslikMi(satirlarHam[0])
    kolon = baslik ?? { telefon: 0, mesaj: 1, ad: 2 }
    veri = baslik ? satirlarHam.slice(1) : satirlarHam
  }
  if (!veri.length) return { satirlar: [], hata: 'Başlık dışında satır yok.' }
  if (veri.length > SMS_EXCEL_UST_SINIR) {
    return { satirlar: [], hata: `En fazla ${SMS_EXCEL_UST_SINIR} satır yüklenebilir.` }
  }

  const ortak = ortakMesaj.trim()
  const gorulen = new Set<string>()
  const satirlar: SmsExcelSatir[] = []

  veri.forEach((r, idx) => {
    const telefonHam = r[kolon.telefon] ?? ''
    const ad = kolon.ad >= 0 ? (r[kolon.ad] ?? '') : ''
    const hucreMesaj = kolon.mesaj >= 0 ? (r[kolon.mesaj] ?? '') : ''
    const govde = hucreMesaj || ortak
    const mesaj = smsExcelGonderimMetni(ad, govde)
    const telefon = gsmNormalize(telefonHam)
    let durum: SmsExcelDurum = 'hazir'
    let aciklama = 'Gönderime hazır'
    if (!telefon) {
      durum = 'gecersiz_numara'
      aciklama = 'Telefon geçersiz veya eksik'
    } else if (!mesaj) {
      durum = 'bos_mesaj'
      aciklama = 'Mesaj boş'
    } else if (mesaj.length > SMS_MESAJ_UST_SINIR) {
      durum = 'uzun_mesaj'
      aciklama = `Mesaj ${SMS_MESAJ_UST_SINIR} karakteri aşıyor`
    } else if (gorulen.has(telefon)) {
      durum = 'mukerrer'
      aciklama = 'Aynı numara listede daha önce var'
    } else {
      gorulen.add(telefon)
    }
    satirlar.push({
      sira: idx + 1,
      ad,
      telefonHam,
      telefon,
      mesaj,
      durum,
      aciklama,
    })
  })

  return { satirlar }
}
