import IsgIslemlerHubClient from '@/components/isg/IsgIslemlerHubClient'

export const dynamic = 'force-dynamic'

export default function IsgIslemlerPage() {
  const satirlar = [
    {
      id: 'saglik-taramasi',
      baslik: 'Sağlık Taraması',
      aciklama: 'Dönem bazlı sağlık taraması ve muayene işaretlemeleri.',
      href: '/isg/islemler/saglik-taramasi',
      renk: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    },
    {
      id: 'tespit-oneri',
      baslik: 'Tespit ve Öneri',
      aciklama: 'İşyeri tespitleri, sorumlu müdürlük, iş birliği ve son tarih takibi.',
      href: '/isg/islemler/tespit-oneri',
      renk: 'border-sky-200 bg-sky-50 text-sky-900',
    },
  ] as const

  return <IsgIslemlerHubClient satirlar={[...satirlar]} />
}
