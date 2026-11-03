import StratejikModulSayfasi from '@/components/stratejik/StratejikModulSayfasi'

export default function FaaliyetRaporuSayfa() {
  return (
    <StratejikModulSayfasi
      baslik="Faaliyet Raporu"
      aciklama="Faaliyet raporunun işlem, rapor ve tanım ekranları."
      kartlar={[
        {
          href: '/stratejik-yonetim/faaliyet-raporu/islemler',
          baslik: 'İşlemler',
          aciklama: 'Faaliyet raporu veri girişi.',
        },
        {
          href: '/stratejik-yonetim/faaliyet-raporu/raporlar',
          baslik: 'Raporlar',
          aciklama: 'Faaliyet raporu çıktıları.',
        },
        {
          href: '/stratejik-yonetim/faaliyet-raporu/tanimlar',
          baslik: 'Tanımlar',
          aciklama: 'Faaliyet raporunda kullanılan tanımlar.',
        },
      ]}
    />
  )
}
