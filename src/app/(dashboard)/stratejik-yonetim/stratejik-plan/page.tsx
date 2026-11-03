import StratejikModulSayfasi from '@/components/stratejik/StratejikModulSayfasi'

export default function StratejikPlanSayfa() {
  return (
    <StratejikModulSayfasi
      baslik="Stratejik Plan"
      aciklama="Dönem, amaç, hedef, faaliyet ve göstergeler ile bunlara ait rapor ve tanımlar."
      kartlar={[
        {
          href: '/stratejik-yonetim/stratejik-plan/islemler',
          baslik: 'İşlemler',
          aciklama: 'Stratejik plan dönemi, amaç, hedef, performans hedefi, faaliyet ve gösterge girişi.',
        },
        {
          href: '/stratejik-yonetim/stratejik-plan/raporlar',
          baslik: 'Raporlar',
          aciklama: 'Stratejik plan raporları.',
        },
        {
          href: '/stratejik-yonetim/stratejik-plan/tanimlar',
          baslik: 'Tanımlar',
          aciklama: 'Stratejik planda kullanılan tanımlar.',
        },
      ]}
    />
  )
}
