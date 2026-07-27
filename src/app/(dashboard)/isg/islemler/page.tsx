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
  ] as const

  return <IsgIslemlerHubClient satirlar={[...satirlar]} />
}
