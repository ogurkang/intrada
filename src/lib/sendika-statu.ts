/** Kadro statüsünden sendika tanım kategorisine eşleme. */
export type SendikaStatuGrubu = 'Memur' | 'İşçi'

const MEMUR_STATULER = new Set(['Memur', 'Sözleşmeli'])
const ISCI_STATULER = new Set(['İşçi', 'Geçici İşçi'])

export function kadroStatuSendikaGrubu(statu: string | null | undefined): SendikaStatuGrubu | null {
  const s = String(statu ?? '').trim()
  if (MEMUR_STATULER.has(s)) return 'Memur'
  if (ISCI_STATULER.has(s)) return 'İşçi'
  return null
}

export function sendikaStatuSira(statu: string): number {
  if (statu === 'Memur') return 0
  if (statu === 'İşçi') return 1
  return 2
}
