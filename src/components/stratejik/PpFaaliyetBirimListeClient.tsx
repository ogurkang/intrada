'use client'

import type { PpFaaliyetBirimRapor } from '@/lib/pp-faaliyet-birim-rapor'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import PpRaporYilListeKabuk from '@/components/stratejik/PpRaporYilListeKabuk'

const LISTE = `${PP_RAPORLAR_BASE}/faaliyetlerden-sorumlu-harcama-birimleri`
const GOR = `${LISTE}/gor`
const EXCEL = '/api/performans-programi/raporlar/faaliyet-birim/excel'

export default function PpFaaliyetBirimListeClient({ rapor }: { rapor: PpFaaliyetBirimRapor }) {
  const satir = rapor.bloklar.reduce((a, b) => a + b.satirlar.length, 0)
  return (
    <PpRaporYilListeKabuk
      baslik="Faaliyetlerden Sorumlu Harcama Birimleri Tablosu"
      aciklama="Her program için ayrı tablo; programlar arasında boş satır ve yeniden başlık. Sorumlu birim hedefteki seçilen müdürlüktür."
      maddeler={[
        { baslik: 'Yıl', metin: 'Varsayılan bir sonraki takvim yılıdır.' },
        { baslik: 'Program', metin: 'Her program kendi başlığıyla ayrı tabloda yer alır.' },
        { baslik: 'Sorumlu', metin: 'Alt program hedefi eklerken seçilen müdürlük yazılır.' },
      ]}
      listeYol={LISTE}
      gorYol={GOR}
      excelYol={EXCEL}
      yil={rapor.yil}
      yillar={rapor.yillar}
      ozetEtiket="Satır"
      ozetDeger={satir}
    />
  )
}
