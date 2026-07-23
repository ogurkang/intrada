import { degerlendirmeTamamlandi } from '@/lib/performans-istatistik'
import { PERF_DURUM_ETIKET, type PerformansDegerlendirmeDurum } from '@/lib/performans'

export type PerformansSatirDurumGirdi = {
  durum: string
  puan_amir1?: number | null
  tek_amir?: boolean
}

export type PerformansIzleyiciRol = 'amir1' | 'amir2' | 'diger'

export function performansSatirDurumMetni(
  p: PerformansSatirDurumGirdi,
  izleyici: PerformansIzleyiciRol,
): string {
  if (degerlendirmeTamamlandi(p)) {
    return 'Değerlendirme Tamamlandı'
  }
  if (p.durum === 'iade') {
    return 'Yeniden Değerlendirme İsteniyor'
  }

  if (izleyici === 'amir2') {
    if (p.durum === 'beklemede_1' || p.puan_amir1 == null) {
      return '1. Amirin Değerlendirmesi Bekleniyor'
    }
    return 'Değerlendirmeniz Bekleniyor'
  }

  if (izleyici === 'amir1') {
    if (p.durum === 'beklemede_1') {
      return 'Değerlendirmeniz Bekleniyor'
    }
    if (p.durum === 'amir1_gonderildi') {
      return '2. Amirin Değerlendirmesi Bekleniyor'
    }
  }

  if (p.durum === 'beklemede_1') return '1. Amirin Değerlendirmesi Bekleniyor'
  if (p.durum === 'amir1_gonderildi') return '2. Amirin Değerlendirmesi Bekleniyor'

  const etiket = PERF_DURUM_ETIKET[p.durum as PerformansDegerlendirmeDurum]
  return etiket ?? p.durum
}
