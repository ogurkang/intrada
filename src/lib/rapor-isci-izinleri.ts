import {
  statuIzinRaporSnapshot,
  statuIzinRaporTablariOlustur,
  type StatuIzinHakRow,
  type StatuIzinHareketRow,
  type StatuIzinRaporSatir,
  type StatuIzinRaporTabVerisi,
} from '@/lib/rapor-statu-izinleri'

export type IsciIzinRaporSatir = StatuIzinRaporSatir
export type IsciIzinRaporTabVerisi = StatuIzinRaporTabVerisi
export type IsciIzinHareketRow = StatuIzinHareketRow
export type IsciIzinHakRow = StatuIzinHakRow

export { statuIzinMudurlukListesi, parseMudurlukParam } from '@/lib/rapor-statu-izinleri'

export function isciIzinRaporSnapshot(
  input: Omit<Parameters<typeof statuIzinRaporSnapshot>[0], 'statuTip'>,
): IsciIzinRaporSatir[] {
  return statuIzinRaporSnapshot({ ...input, statuTip: 'isci' })
}

export function isciIzinRaporTablariOlustur(
  input: Omit<Parameters<typeof statuIzinRaporTablariOlustur>[0], 'statuTip'>,
): IsciIzinRaporTabVerisi[] {
  return statuIzinRaporTablariOlustur({ ...input, statuTip: 'isci' })
}
