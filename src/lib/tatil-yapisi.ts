export type TatilYapisi = 'Yıllık Tatil' | 'Sabit Tatil'

export function tatilYapisiHesapla(tatilAdi: string | null | undefined, tatilTuru: string | null | undefined): TatilYapisi {
  const tur = String(tatilTuru ?? '').toLocaleLowerCase('tr-TR')
  const ad = String(tatilAdi ?? '').toLocaleLowerCase('tr-TR')
  const dini = tur.includes('dini') || ad.includes('ramazan') || ad.includes('kurban')
  return dini ? 'Yıllık Tatil' : 'Sabit Tatil'
}
