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

export function yetkinlikAuditDegerGoster(alan: string, deger: unknown): string {
  if (alan === 'bilgisayar_kullaniyor') return deger ? BILGISAYAR_KULLANIYOR : BILGISAYAR_KULLANMIYOR
  return deger == null || deger === '' ? '—' : String(deger)
}

export function yetkinlikAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  const o = (onceki && typeof onceki === 'object' ? onceki : {}) as Record<string, unknown>
  const s = (sonraki && typeof sonraki === 'object' ? sonraki : {}) as Record<string, unknown>
  return [...new Set([...Object.keys(o), ...Object.keys(s)])]
    .filter(a => String(o[a] ?? '') !== String(s[a] ?? ''))
    .map(alan => ({
      alan,
      etiket: alan === 'bilgisayar_kullaniyor' ? 'Yetkinlik' : alan,
      onceki: o[alan],
      sonraki: s[alan],
    }))
}
