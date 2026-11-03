import StratejikModulSayfasi from '@/components/stratejik/StratejikModulSayfasi'

export default function PerformansProgramiSayfa() {
  return (
    <StratejikModulSayfasi
      baslik="Performans Programı"
      aciklama="Yıllık program, müdürlük maliyeti, performans göstergesi ve bütçe kodu."
      kartlar={[
        {
          href: '/stratejik-yonetim/performans-programi/islemler',
          baslik: 'İşlemler',
          aciklama: 'Program, alt program, hedef, faaliyet maliyeti ve gösterge girişi.',
        },
        {
          href: '/stratejik-yonetim/performans-programi/raporlar',
          baslik: 'Raporlar',
          aciklama: 'Müdürlük performans bilgisi. Yıl ve müdürlük seçilerek tablo ve Excel alınır.',
        },
        {
          href: '/stratejik-yonetim/performans-programi/tanimlar',
          baslik: 'Tanımlar',
          aciklama: 'Bütçe kodu tanımları.',
        },
      ]}
    />
  )
}
