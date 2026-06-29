/** Personel görev bilgileri — kadro normundan bağımsız; sicil ile taşınır. */

export const GOREV_TURU_OPTIONS = ['Çalışan', 'Aylıksız İzin', 'Geçici Görevlendirme', 'Kurum Görevlendirme', 'Yarı Zamanlı'] as const
export type GorevTuru = (typeof GOREV_TURU_OPTIONS)[number]

/** Görevlendirme sayılan türler — yerleşke/konum raporlarında otomatik "Dış" kabul edilir. */
export const GOREVLENDIRME_TURLERI = ['Geçici Görevlendirme', 'Kurum Görevlendirme'] as const

/** Personel görevlendirme türü mü? (rapor konumunu "Dış" yapan türler). */
export function gorevlendirmeTuruMu(tur: string | null | undefined): boolean {
  const t = (tur ?? '').trim()
  return t === 'Geçici Görevlendirme' || t === 'Kurum Görevlendirme'
}

export const GOREV_DURUMU_OPTIONS = ['Diğer', 'Engelli', 'Eski Hükümlü'] as const
export type GorevDurumu = (typeof GOREV_DURUMU_OPTIONS)[number]

/** Başlangıç tarihi zorunlu türler (Kurum Görevlendirme hariç — isteğe bağlı). */
export function gorevTuruTarihZorunlu(tur: string | null | undefined): boolean {
  const t = (tur ?? '').trim()
  return t === 'Aylıksız İzin' || t === 'Geçici Görevlendirme' || t === 'Yarı Zamanlı'
}

export function gorevTuruAciklamaGoster(tur: string | null | undefined): boolean {
  const t = (tur ?? '').trim()
  return t === 'Geçici Görevlendirme' || t === 'Kurum Görevlendirme'
}

/** Tarih alanlarının gösterileceği türler (zorunluluktan bağımsız). */
export function gorevTuruBitisGoster(tur: string | null | undefined): boolean {
  const t = (tur ?? '').trim()
  return t === 'Aylıksız İzin' || t === 'Geçici Görevlendirme' || t === 'Kurum Görevlendirme' || t === 'Yarı Zamanlı'
}

/** Yemek hakkı seçeneği Geçici ve Kurum Görevlendirmede gösterilir. */
export function gorevTuruYemekHakkiGoster(tur: string | null | undefined): boolean {
  const t = (tur ?? '').trim()
  return t === 'Geçici Görevlendirme' || t === 'Kurum Görevlendirme'
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
