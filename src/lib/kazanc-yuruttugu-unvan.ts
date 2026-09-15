import type { KazancSatirLookup } from '@/lib/kazanc-teknisyen-ek-gosterge'

export const CALISAN_YURUTTUGU_UNVAN_KOLON = 'yuruttugu_unvan_id'

export function yuruttuguUnvanKolonuYokMu(message: string | null | undefined): boolean {
  const m = String(message ?? '')
  return m.includes(CALISAN_YURUTTUGU_UNVAN_KOLON) && (m.includes('does not exist') || m.includes('42703'))
}

function doluMetin(v: string | null | undefined): string | null {
  const t = String(v ?? '').trim()
  return t ? t : null
}

/** Yürütülen unvanın kazanç SDS’si (lookup 1. derece sarmalayıcısını kullanır). */
export function yuruttuguUnvanSdsAl(
  lookup: KazancSatirLookup,
  opts: {
    yuruttuguUnvanId: number | null | undefined
    ogrenimId: number | null | undefined
    derece: number | null | undefined
  },
): string | null {
  const unvanId = opts.yuruttuguUnvanId
  const ogrenimId = opts.ogrenimId
  const derece = opts.derece
  if (unvanId == null || ogrenimId == null || derece == null || !Number.isFinite(derece)) return null
  return doluMetin(lookup(unvanId, ogrenimId, derece)?.sds_orani)
}

export function puanSdsYuruttuguUnvanIle<T extends { sds_orani?: string | null }>(
  puan: T,
  sds: string | null,
): T {
  if (!sds) return puan
  return { ...puan, sds_orani: sds }
}
