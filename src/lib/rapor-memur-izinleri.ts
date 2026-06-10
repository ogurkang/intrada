import {
  statuIzinRaporSnapshot,
  statuIzinRaporTablariOlustur,
  type StatuIzinHakRow,
  type StatuIzinHareketRow,
  type StatuIzinRaporSatir,
  type StatuIzinRaporTabVerisi,
} from '@/lib/rapor-statu-izinleri'

export type MemurIzinRaporSatir = StatuIzinRaporSatir
export type MemurIzinRaporTabVerisi = StatuIzinRaporTabVerisi
export type MemurIzinHareketRow = StatuIzinHareketRow
export type MemurIzinHakRow = StatuIzinHakRow

export { statuIzinMudurlukListesi, parseMudurlukParam } from '@/lib/rapor-statu-izinleri'

export function memurIzinRaporSnapshot(
  input: Omit<Parameters<typeof statuIzinRaporSnapshot>[0], 'statuTip'>,
): MemurIzinRaporSatir[] {
  return statuIzinRaporSnapshot({ ...input, statuTip: 'memur' })
}

export function memurIzinRaporTablariOlustur(
  input: Omit<Parameters<typeof statuIzinRaporTablariOlustur>[0], 'statuTip'>,
): MemurIzinRaporTabVerisi[] {
  return statuIzinRaporTablariOlustur({ ...input, statuTip: 'memur' })
}
