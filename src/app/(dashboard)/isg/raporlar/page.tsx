import IsgIslemlerHubClient, { type IsgIslemHubSatir } from '@/components/isg/IsgIslemlerHubClient'

const RAPORLAR: IsgIslemHubSatir[] = [
  {
    id: 'belediye-geneli',
    baslik: 'Belediye Geneli Personel Listesi',
    aciklama: 'Belediye genelindeki aktif personelin kimlik, statü, kadro ve görev bilgileri; yıllık ve aylık sekmeler.',
    href: '/isg/raporlar/belediye-geneli-personel-liste',
    renk: 'border-teal-200 bg-teal-50 text-teal-900',
  },
  {
    id: 'gorev-yeri-degisen',
    baslik: 'Görev Yeri Değişen Personel Listesi',
    aciklama: 'Görev müdürlüğü değişen veya ayrılan personel hareketleri; ADABEL hariç, yıllık ve aylık sekmeler.',
    href: '/isg/raporlar/gorev-yeri-degisen-personel',
    renk: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  {
    id: 'saglik-taramasi-bilgileri',
    baslik: 'Sağlık Taraması Bilgileri',
    aciklama: 'Yıla göre aktif personelin tarama ve muayene durumu (Evet/Hayır); müdürlük ve tehlike sınıfı ile.',
    href: '/isg/raporlar/saglik-taramasi-bilgileri',
    renk: 'border-sky-200 bg-sky-50 text-sky-900',
  },
]

export default function IsgRaporlarPage() {
  return (
    <IsgIslemlerHubClient
      satirlar={RAPORLAR}
      baslik="İSG — Raporlar"
      aciklama="Rapor kartına tıklayarak ilgili listeye gidin."
    />
  )
}
