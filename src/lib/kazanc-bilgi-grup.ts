import type { Tables } from '@/types/database'

export type KazancBilgiListeRow = Tables<'tanim_kazanc_bilgisi'> & {
  unvan_adi: string
  ogrenim_adi: string
}

export function kazancGrupAnahtar(r: KazancBilgiListeRow): string {
  return r.kazanc_grup_id != null ? `g:${r.kazanc_grup_id}` : `i:${r.id}`
}

/** Aynı kazanc_grup_id veya tek satır (NULL grup) için gruplar */
export function kazancSatirlariGrupla(rows: KazancBilgiListeRow[]): KazancBilgiListeRow[][] {
  const m = new Map<string, KazancBilgiListeRow[]>()
  for (const r of rows) {
    const k = kazancGrupAnahtar(r)
    if (!m.has(k)) m.set(k, [])
    m.get(k)!.push(r)
  }
  return Array.from(m.values()).map((g) =>
    [...g].sort((a, b) => a.ogrenim_adi.localeCompare(b.ogrenim_adi, 'tr')),
  )
}

export function grupOgrenimEtiket(grup: KazancBilgiListeRow[]): string {
  return grup.map((r) => r.ogrenim_adi).join(', ')
}
