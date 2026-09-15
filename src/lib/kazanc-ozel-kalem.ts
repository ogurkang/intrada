import { unvanAdiNorm } from '@/lib/kazanc-yan-odeme'

/** Özel Kalem Müdürü ve Belediye Başkan Yardımcısı kazanç satırı her zaman bu dereceden okunur. */
export const OZEL_KALEM_KAZANC_DERECE = 1

export function unvanKazancBirinciDereceMi(unvanAdi: string | null | undefined): boolean {
  const n = unvanAdiNorm(unvanAdi)
  return n === 'OZELKALEMMUDURU' || n === 'BELEDIYEBASKANYARDIMCISI'
}

/** @deprecated unvanKazancBirinciDereceMi — Özel Kalem + Başkan Yardımcısı */
export function unvanOzelKalemMuduruMi(unvanAdi: string | null | undefined): boolean {
  return unvanKazancBirinciDereceMi(unvanAdi)
}

export function ozelKalemUnvanIdleri(
  unvanlar: Array<{ id: number; unvan_adi: string | null }>,
): Set<number> {
  return new Set(unvanlar.filter(u => unvanKazancBirinciDereceMi(u.unvan_adi)).map(u => u.id))
}

/** KHA ne olursa olsun 1. derece kazanç unvanları. */
export function kazancTanimiDerecesi(
  unvanAdi: string | null | undefined,
  khaDerece: number,
): number {
  return unvanKazancBirinciDereceMi(unvanAdi) ? OZEL_KALEM_KAZANC_DERECE : khaDerece
}

export function kazancLookupOzelKalemIle<T>(
  lookup: (unvanId: number, ogrenimId: number, derece: number) => T | null,
  ozelKalemUnvanIds: Set<number>,
): (unvanId: number, ogrenimId: number, derece: number) => T | null {
  if (!ozelKalemUnvanIds.size) return lookup
  return (unvanId, ogrenimId, derece) =>
    lookup(unvanId, ogrenimId, ozelKalemUnvanIds.has(unvanId) ? OZEL_KALEM_KAZANC_DERECE : derece)
}

export function kazancBirinciDereceAciklama(
  unvanAdi: string | null | undefined,
): string | null {
  if (!unvanKazancBirinciDereceMi(unvanAdi)) return null
  const n = unvanAdiNorm(unvanAdi)
  const etiket = n === 'BELEDIYEBASKANYARDIMCISI' ? 'Belediye Başkan Yardımcısı' : 'Özel Kalem Müdürü'
  return `${etiket} kazancı 1. derece tanımından alınır; KHA dikkate alınmaz.`
}
