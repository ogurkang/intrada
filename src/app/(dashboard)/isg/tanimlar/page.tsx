import IsgIslemlerHubClient from '@/components/isg/IsgIslemlerHubClient'

export default function IsgTanimlarPage() {
  return (
    <IsgIslemlerHubClient
      satirlar={[
        {
          id: 'isg-durum',
          baslik: 'İSG Durum Tanımları',
          aciklama: 'Tespit ve öneri süreçlerindeki ilerleme aşamaları (%25 aralıklarla).',
          href: '/isg/tanimlar/durum',
          renk: 'border-amber-200 bg-amber-50 text-amber-900',
        },
      ]}
      baslik="İSG — Tanımlar"
      aciklama="Tanım kartına tıklayarak ilgili listeye gidin."
    />
  )
}
