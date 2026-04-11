/** Personel görev bilgileri — kadro normundan bağımsız; sicil ile taşınır. */

export const GOREV_TURU_OPTIONS = ['Çalışan', 'Aylıksız İzin', 'Geçici Görevlendirme', 'Yarı Zamanlı'] as const
export type GorevTuru = (typeof GOREV_TURU_OPTIONS)[number]

export const GOREV_DURUMU_OPTIONS = ['Diğer', 'Engelli', 'Eski Hükümlü'] as const
export type GorevDurumu = (typeof GOREV_DURUMU_OPTIONS)[number]

export function gorevTuruTarihZorunlu(tur: string | null | undefined): boolean {
  const t = (tur ?? '').trim()
  return t === 'Aylıksız İzin' || t === 'Geçici Görevlendirme' || t === 'Yarı Zamanlı'
}

export function gorevTuruAciklamaGoster(tur: string | null | undefined): boolean {
  return (tur ?? '').trim() === 'Geçici Görevlendirme'
}

/** Bitiş tarihi gösterilecek türler (aylıksız, geçici, yarı zamanlı). */
export function gorevTuruBitisGoster(tur: string | null | undefined): boolean {
  return gorevTuruTarihZorunlu(tur)
}

/** Yemek hakkı seçeneği sadece Geçici Görevlendirmede gösterilir. */
export function gorevTuruYemekHakkiGoster(tur: string | null | undefined): boolean {
  return (tur ?? '').trim() === 'Geçici Görevlendirme'
}

/** Engelli detay alanları (oran, başlangıç, bitiş) Engelli durumunda gösterilir. */
export function gorevDurumuEngellimi(durum: string | null | undefined): boolean {
  return (durum ?? '').trim() === 'Engelli'
}

/** AYY statü bazlı hesap için calisan satırı tipi. */
export interface AyyStatuPersonelRow {
  sicil_no: string
  ad_soyad: string
  gorev_turu: string
  gorev_turu_tarihi: string | null
  gorev_turu_bitis_tarihi: string | null
  gorev_turu_yemek_hakki: boolean | null
  isZabita: boolean
  unvan: string
}
