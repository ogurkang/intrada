/** Personel kartı — Taşınır Görevi seçenekleri */
export const TASINIR_GOREVI_OPTIONS = [
  'Taşınır Kayıt Yetkilisi',
  'Taşınır Kontrol Yetkilisi',
] as const

export type TasinirGorevi = (typeof TASINIR_GOREVI_OPTIONS)[number]

export function tasinirGoreviNormalize(v: string | null | undefined): TasinirGorevi | null {
  const t = String(v ?? '').trim()
  if (!t) return null
  return (TASINIR_GOREVI_OPTIONS as readonly string[]).includes(t) ? (t as TasinirGorevi) : null
}

/** Sapma raporunda yan ödeme farkının taşınır görevden geldiğini belirtir. */
export function tasinirGoreviSapmaEtiket(gorev: TasinirGorevi): string {
  return gorev === 'Taşınır Kayıt Yetkilisi' ? 'TKY Görevi' : gorev
}

export const TASINIR_GOREVLENDIRME_MENU_ANAHTAR = 'tasinir_gorevlendirme_menu'
