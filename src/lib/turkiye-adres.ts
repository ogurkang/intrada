import { ILCELER_BY_IL, TURKIYE_ILLER } from '@/data/turkiye-il-ilce'

export { TURKIYE_ILLER, ILCELER_BY_IL }

export function ilcelerForIl(il: string | null | undefined): readonly string[] {
  const key = String(il ?? '').trim()
  if (!key) return []
  return ILCELER_BY_IL[key] ?? []
}

export function ilGecerliMi(il: string | null | undefined): boolean {
  const t = String(il ?? '').trim()
  return TURKIYE_ILLER.includes(t as (typeof TURKIYE_ILLER)[number])
}

export function ilceGecerliMi(il: string | null | undefined, ilce: string | null | undefined): boolean {
  const i = String(il ?? '').trim()
  const ic = String(ilce ?? '').trim()
  if (!i || !ic) return false
  return ilcelerForIl(i).includes(ic)
}

function normKarsilastir(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('tr-TR') === b.trim().toLocaleLowerCase('tr-TR')
}

/** Excel / serbest metin → kanonik il adı */
export function ilAdiBul(raw: string | null | undefined): string | null {
  const t = String(raw ?? '').trim()
  if (!t) return null
  return TURKIYE_ILLER.find(i => normKarsilastir(i, t)) ?? null
}

/** Excel / serbest metin → kanonik ilçe adı */
export function ilceAdiBul(il: string, raw: string | null | undefined): string | null {
  const ic = String(raw ?? '').trim()
  if (!ic) return null
  const list = ilcelerForIl(il)
  return list.find(x => normKarsilastir(x, ic)) ?? null
}

export function adresMahalleAnahtari(il: string, ilce: string, mahalle: string): string {
  return `${il.trim().toLocaleLowerCase('tr-TR')}|${ilce.trim().toLocaleLowerCase('tr-TR')}|${mahalle.trim().toLocaleLowerCase('tr-TR')}`
}
