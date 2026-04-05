/** Personel görev bilgileri — kadro normundan bağımsız; sicil ile taşınır. */

export const GOREV_TURU_OPTIONS = ['Çalışan', 'Aylıksız İzin', 'Geçici Görevlendirme'] as const
export type GorevTuru = (typeof GOREV_TURU_OPTIONS)[number]

export const GOREV_DURUMU_OPTIONS = ['Diğer', 'Engelli', 'Eski Hükümlü'] as const
export type GorevDurumu = (typeof GOREV_DURUMU_OPTIONS)[number]

export function gorevTuruTarihZorunlu(tur: string | null | undefined): boolean {
  const t = (tur ?? '').trim()
  return t === 'Aylıksız İzin' || t === 'Geçici Görevlendirme'
}
