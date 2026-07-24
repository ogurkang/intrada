import { baskanYardimcisiBirimindeMi, type OrgBirimSatir } from '@/lib/performans-amir'
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

export function performansAmir2BildirimSenaryoBelirle(
  amir1Sicil: string | null | undefined,
  birimler: OrgBirimSatir[],
): PerformansAmir2BildirimSenaryo {
  if (amir1Sicil && baskanYardimcisiBirimindeMi(amir1Sicil, birimler)) {
    return 'baskan_yardimcisi'
  }
  return 'mudur'
}

export function performansAmir2BildirimMetni(params: {
  amir2Ad: string
  yil: number
  senaryo: PerformansAmir2BildirimSenaryo
  mudurlukAdi: string
  amir1Ad?: string | null
}): string {
  const ad = params.amir2Ad.trim() || 'Yetkili'
  const mud = mudurlukAdiSms(params.mudurlukAdi)
  const ortak = `${params.yil} yılı personel performans değerlendirmesi kapsamında`

  if (params.senaryo === 'baskan_yardimcisi') {
    const amir1 = (params.amir1Ad ?? '').trim() || '1. amir'
    return (
      `Sayın ${ad}, ${ortak} ${mud} için değerlendirmesi ${amir1} tarafından tamamlanmış olup ` +
      `tarafınızca değerlendirme yapılması beklenmektedir. ${SMS_GIRIS}`
    )
  }

  return (
    `Sayın ${ad}, ${ortak} ${mud} değerlendirmesi tamamlanmış olup ` +
    `tarafınızca değerlendirme yapılması beklenmektedir. ${SMS_GIRIS}`
  )
}
