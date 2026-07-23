import { trNormalize } from '@/lib/turkce-search'

/** Görev sütunu öncelikli unvan metni (asil/vekil fark etmez). */
export function kadroGorevUnvani(r: {
  gorev_unvani?: string | null
  kadro_unvani?: string | null
}): string {
  return String(r.gorev_unvani ?? r.kadro_unvani ?? '').trim()
}

export function performansBelediyeBaskaniUnvaniMi(unvan: string): boolean {
  const n = trNormalize(unvan)
  return n.includes('belediye') && n.includes('baskan') && !n.includes('yardimci')
}

/** «… Müdürü» unvanı (yardımcı / başkan hariç). */
export function performansMudurUnvaniMi(unvan: string): boolean {
  const n = trNormalize(unvan)
  if (!n.includes('muduru')) return false
  if (n.includes('yardimci')) return false
  if (performansBelediyeBaskaniUnvaniMi(unvan)) return false
  return true
}

export function performansBaskanYardimcisiUnvaniMi(unvan: string): boolean {
  const n = trNormalize(unvan)
  return n.includes('yardimci') && n.includes('baskan')
}

export function kadroSatiriSicilEslesir(
  r: { asil?: string | null; vekil?: string | null },
  sicilNo: string,
): boolean {
  const hedef = sicilNo.trim()
  if (!hedef) return false
  return String(r.asil ?? '').trim() === hedef || String(r.vekil ?? '').trim() === hedef
}
