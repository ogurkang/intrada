import { sendikaStatuSira } from '@/lib/sendika-statu'
import type { Tables } from '@/types/database'

export type TanimSendikaRow = Tables<'tanim_sendika'>

export function sortTanimSendika(rows: TanimSendikaRow[]): TanimSendikaRow[] {
  return [...rows].sort((a, b) => {
    const sa = sendikaStatuSira(a.statu)
    const sb = sendikaStatuSira(b.statu)
    if (sa !== sb) return sa - sb
    const ka = (a.kisa_ad ?? '').localeCompare(b.kisa_ad ?? '', 'tr')
    if (ka !== 0) return ka
    return (a.uzun_ad ?? '').localeCompare(b.uzun_ad ?? '', 'tr')
  })
}

export function sortBildirimSendikaList<T extends { sicil_no: string; ad_soyad?: string | null; kisa_ad?: string | null }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const ad = (a.ad_soyad ?? '').localeCompare(b.ad_soyad ?? '', 'tr')
    if (ad !== 0) return ad
    const sk = (a.kisa_ad ?? '').localeCompare(b.kisa_ad ?? '', 'tr')
    if (sk !== 0) return sk
    return a.sicil_no.localeCompare(b.sicil_no, 'tr')
  })
}
