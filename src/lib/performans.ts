/** Performans Yönetimi — ortak tipler ve yardımcılar */

export type PerformansFormTipi = 'memur' | 'sef' | 'yonetici' | 'baskan'

export type PerformansDegerlendirmeDurum =
  | 'beklemede_1'
  | 'amir1_gonderildi'
  | 'iade'
  | 'amir2_onay'
  | 'tamamlandi'

export type PerformansKriterGrup = 'ortak' | 'memur' | 'sef' | 'yonetici'

export type PerformansDonemDurum = 'Açık' | 'Kapalı' | 'Yayınlandı'

export const PERF_DURUM_ETIKET: Record<PerformansDegerlendirmeDurum, string> = {
  beklemede_1: '1. amir bekleniyor',
  amir1_gonderildi: '2. amir bekleniyor',
  iade: '1. amire iade',
  amir2_onay: '2. amir onayladı',
  tamamlandi: 'Tamamlandı',
}

export const PERF_FORM_ETIKET: Record<PerformansFormTipi, string> = {
  memur: 'Memur',
  sef: 'Şef',
  yonetici: 'Yönetici',
  baskan: 'Belediye Başkanı',
}

export const PERF_PUAN_BANDA: { min: number; max: number; etiket: string }[] = [
  { min: 0, max: 34, etiket: 'Çok Yetersiz' },
  { min: 35, max: 59, etiket: 'Yetersiz' },
  { min: 60, max: 74, etiket: 'Orta' },
  { min: 75, max: 89, etiket: 'İyi' },
  { min: 90, max: 100, etiket: 'Çok İyi' },
]

export function performansPuanBandi(puan: number | null | undefined): string {
  if (puan == null || !Number.isFinite(puan)) return '—'
  const p = Math.round(puan)
  return PERF_PUAN_BANDA.find(b => p >= b.min && p <= b.max)?.etiket ?? '—'
}

/** Kesirli ortalamayı yönetmelikteki gibi tam sayıya yaklaştırır */
export function performansOrtalamaYuvarla(a: number, b?: number | null): number {
  if (b == null || !Number.isFinite(b)) return Math.round(a)
  return Math.round((a + b) / 2)
}

/** Form tipine göre değerlendirilecek kriter kod aralıkları */
export function performansKriterKodlari(formTipi: PerformansFormTipi): number[] {
  const ortak = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  if (formTipi === 'memur') return [...ortak, 16, 17, 18, 19, 20]
  if (formTipi === 'sef') return [...ortak, 21, 22, 23, 24, 25]
  if (formTipi === 'yonetici' || formTipi === 'baskan') return [...ortak, 26, 27, 28, 29, 30]
  return ortak
}

/**
 * Kadro unvanından form tipi tahmini (v1 heuristik).
 * "Şef" / "Müdür" / "Başkan" eşleşmeleri önceliklidir.
 */
export function formTipiFromUnvan(unvan: string | null | undefined): PerformansFormTipi {
  const u = String(unvan ?? '').toLocaleLowerCase('tr-TR')
  if (u.includes('belediye başkanı') && !u.includes('yardımcı')) return 'baskan'
  if (u.includes('müdür') || u.includes('başkan yardımcı')) return 'yonetici'
  if (u.includes('şef')) return 'sef'
  return 'memur'
}
