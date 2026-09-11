import { unvanAdiNorm } from '@/lib/kazanc-yan-odeme'

/** Özel Kalem Müdürü kazanç satırı her zaman bu dereceden okunur. */
export const OZEL_KALEM_KAZANC_DERECE = 1

export function unvanOzelKalemMuduruMi(unvanAdi: string | null | undefined): boolean {
  return unvanAdiNorm(unvanAdi) === 'OZELKALEMMUDURU'
}

export function ozelKalemUnvanIdleri(
  unvanlar: Array<{ id: number; unvan_adi: string | null }>,
): Set<number> {
  return new Set(unvanlar.filter(u => unvanOzelKalemMuduruMi(u.unvan_adi)).map(u => u.id))
}

/** KHA ne olursa olsun Özel Kalem Müdürü için 1. derece. */
export function kazancTanimiDerecesi(
  unvanAdi: string | null | undefined,
  khaDerece: number,
): number {
  return unvanOzelKalemMuduruMi(unvanAdi) ? OZEL_KALEM_KAZANC_DERECE : khaDerece
}

export function kazancLookupOzelKalemIle<T>(
  lookup: (unvanId: number, ogrenimId: number, derece: number) => T | null,
  ozelKalemUnvanIds: Set<number>,
): (unvanId: number, ogrenimId: number, derece: number) => T | null {
  if (!ozelKalemUnvanIds.size) return lookup
  return (unvanId, ogrenimId, derece) =>
    lookup(unvanId, ogrenimId, ozelKalemUnvanIds.has(unvanId) ? OZEL_KALEM_KAZANC_DERECE : derece)
}
