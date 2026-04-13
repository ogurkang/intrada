import YerelBilgiIslemlerHubClient from '@/components/yerel-bilgi/YerelBilgiIslemlerHubClient'

export const dynamic = 'force-dynamic'

export default function YerelBilgiIslemlerPage() {
  const y = new Date().getFullYear()
  const yTahmin = y + 1

  const satirlar = [
    {
      id: 'abg',
      donemAdi: 'Araç Bilgileri Girişi',
      aciklama: 'Araç sahiplik, durum, tür ve plaka / şasi kayıtları.',
      href: '/yerel-bilgi/islemler/arac-bilgileri',
      renk: 'border-sky-200 bg-sky-50 text-sky-900',
    },
    {
      id: 'btg',
      donemAdi: `${yTahmin} Yılı Bütçe Tahminleri Tablosu`,
      aciklama: `Bütçe tahmin tutarları; sütun yılı cari yıl + 1 (${yTahmin}).`,
      href: '/yerel-bilgi/islemler/butce-tahminleri',
      renk: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    },
    {
      id: 'bgg',
      donemAdi: `${y} Yılı Bütçe Gerçekleşmeleri Tablosu`,
      aciklama: `Bütçe gerçekleşme tutarları; sütun yılı cari yıl (${y}).`,
      href: '/yerel-bilgi/islemler/butce-gerceklesmeleri',
      renk: 'border-orange-200 bg-orange-50 text-orange-900',
    },
  ] as const

  return <YerelBilgiIslemlerHubClient satirlar={[...satirlar]} />
}
