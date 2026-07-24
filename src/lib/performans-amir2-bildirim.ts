import { baskanYardimcisiBirimindeMi, type OrgBirimSatir } from '@/lib/performans-amir'
import { smsOriginatorListesi, type SmsAyarRow } from '@/lib/sms-ayar'
import { trNormalize } from '@/lib/turkce-search'

/** Test aşamasında 2. amir bildirim SMS hedefi (prod'da amir2 telefonu kullanılacak). */
export const PERFORMANS_AMIR2_SMS_TEST_TELEFON = '05322804987'

/** Performans 2. amir bildirim SMS alfanumerik başlığı. */
export const PERFORMANS_AMIR2_SMS_ORIGINATOR = 'ADPZRIBLD'

export type PerformansAmir2BildirimSenaryo = 'mudur' | 'baskan_yardimcisi'

const SMS_GIRIS =
  'Değerlendirme yapmak için intrada.adapazari.bel.tr adresine giriş yapabilirsiniz. Bilgilerinize.'

function mudurlukAdiSms(mudurlukAdi: string): string {
  const ad = mudurlukAdi.trim()
  if (!ad) return 'Müdürlük'
  const n = trNormalize(ad)
  if (n.includes('mudurlugu') || n.endsWith('mudurluk')) return ad
  return `${ad} Müdürlüğü`
}

/** Performans bildirim SMS başlığını çözer; tanımlarda yoksa net hata döner. */
export function performansAmir2SmsOriginator(ayar: SmsAyarRow | null): { originator?: string; hata?: string } {
  const hedef = PERFORMANS_AMIR2_SMS_ORIGINATOR
  const liste = smsOriginatorListesi(ayar)
  if (liste.includes(hedef)) return { originator: hedef }
  return {
    hata:
      `SMS başlığı "${hedef}" tanımlı değil. İletişim Yönetimi → Tanımlar ekranında ` +
      `Originator, Originator2 veya Originator3 alanlarından birine ${hedef} ekleyin.`,
  }
}

export function performansAmir2BildirimSenaryoBelirle(
  amir1Sicil: string | null | undefined,
  birimler: OrgBirimSatir[],
): PerformansAmir2BildirimSenaryo {
  if (amir1Sicil && baskanYardimcisiBirimindeMi(amir1Sicil, birimler)) {
    return 'baskan_yardimcisi'
  }
  return 'mudur'
}

/** BBY senaryosunda mesajda geçecek değerlendirilen personel adları (müdür vb.). */
export function performansDegerlendirilenAdlariMetni(adlar: string[]): string {
  const uniq = [...new Set(adlar.map(a => a.trim()).filter(Boolean))]
  if (uniq.length === 0) return 'personel'
  if (uniq.length === 1) return uniq[0]
  if (uniq.length === 2) return `${uniq[0]} ve ${uniq[1]}`
  return `${uniq.slice(0, -1).join(', ')} ve ${uniq[uniq.length - 1]}`
}

export function performansAmir2BildirimMetni(params: {
  amir2Ad: string
  yil: number
  senaryo: PerformansAmir2BildirimSenaryo
  mudurlukAdi: string
  amir1Ad?: string | null
  /** BBY 1. amir senaryosunda değerlendirilen müdürün adı soyadı */
  degerlendirilenAd?: string | null
}): string {
  const ad = params.amir2Ad.trim() || 'Yetkili'
  const mud = mudurlukAdiSms(params.mudurlukAdi)
  const ortak = `${params.yil} yılı personel performans değerlendirmesi kapsamında`

  if (params.senaryo === 'baskan_yardimcisi') {
    const amir1 = (params.amir1Ad ?? '').trim() || '1. amir'
    const hedef = (params.degerlendirilenAd ?? '').trim() || 'personel'
    return (
      `Sayın ${ad}, ${ortak} ${hedef} için değerlendirmesi ${amir1} tarafından tamamlanmış olup ` +
      `tarafınızca değerlendirme yapılması beklenmektedir. ${SMS_GIRIS}`
    )
  }

  return (
    `Sayın ${ad}, ${ortak} ${mud} değerlendirmesi tamamlanmış olup ` +
    `tarafınızca değerlendirme yapılması beklenmektedir. ${SMS_GIRIS}`
  )
}
