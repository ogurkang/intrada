import { gsmNormalize } from '@/lib/sms-mesajpaketi'
import { trNormalize } from '@/lib/turkce-search'

export const SMS_EXCEL_UST_SINIR = 500
export const SMS_MESAJ_UST_SINIR = 900

const TELEFON_BASLIK = new Set(['telefon', 'gsm', 'cep', 'numara', 'tel', 'mobile', 'telefonno', 'ceptelefonu', 'ceptel'])
const MESAJ_BASLIK = new Set(['mesaj', 'metin', 'sms', 'mesajmetni'])
const AD_BASLIK = new Set(['adsoyad', 'isim', 'alici', 'ad', 'adisoyadi'])

export type SmsExcelDurum = 'hazir' | 'gecersiz_numara' | 'bos_mesaj' | 'uzun_mesaj' | 'mukerrer'

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

/**
 * Excel satırlarından gönderim önizlemesi.
 * Başlık satırı Telefon / Ad Soyad / Mesaj ise tanınır; yoksa A=telefon, B=mesaj, C=ad.
 * Mesaj hücresi boşsa ortak mesaj kullanılır.
 */
export function smsExcelOnizleme(
  hamSatirlar: unknown[][],
  ortakMesaj: string,
): { satirlar: SmsExcelSatir[]; hata?: string } {
  const satirlarHam = hamSatirlar
    .map(r => (Array.isArray(r) ? r.map(hucre) : []))
    .filter(r => r.some(Boolean))
  if (!satirlarHam.length) return { satirlar: [], hata: 'Dosyada satır yok.' }

  const baslik = baslikMi(satirlarHam[0])
  const veri = baslik ? satirlarHam.slice(1) : satirlarHam
  const kolon = baslik ?? { telefon: 0, mesaj: 1, ad: 2 }
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
