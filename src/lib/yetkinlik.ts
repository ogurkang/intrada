export const BILGISAYAR_KULLANIYOR = 'Bilgisayar Kullanıyor'
export const BILGISAYAR_KULLANMIYOR = 'Bilgisayar Kullanmıyor'

export const BILGISAYAR_YETKINLIK_SECENEKLER = [BILGISAYAR_KULLANIYOR, BILGISAYAR_KULLANMIYOR] as const

export function bilgisayarYetkinlikEtiket(v: boolean | null | undefined): string {
  return v === false ? BILGISAYAR_KULLANMIYOR : BILGISAYAR_KULLANIYOR
}

export function bilgisayarYetkinlikParse(v: string | null | undefined): boolean {
  const t = String(v ?? '').trim()
  if (t === BILGISAYAR_KULLANMIYOR) return false
  return true
}
