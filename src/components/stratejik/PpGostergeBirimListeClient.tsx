'use client'

import type { PpGostergeBirimRapor } from '@/lib/pp-gosterge-birim-rapor'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import PpRaporYilListeKabuk from '@/components/stratejik/PpRaporYilListeKabuk'

const LISTE = `${PP_RAPORLAR_BASE}/performans-gostergeleri-izleme-birimleri`
const GOR = `${LISTE}/gor`
const EXCEL = '/api/performans-programi/raporlar/gosterge-birim/excel'

export default function PpGostergeBirimListeClient({ rapor }: { rapor: PpGostergeBirimRapor }) {
  return (
    <PpRaporYilListeKabuk
      baslik="Performans Göstergelerinin İzlenmesi ve Takibinden Sorumlu Birimler Tablosu"
      aciklama="Programlar tek tabloda alt alta; ekstra boş satır veya yeniden başlık yoktur. İlgili müdürlük hedefteki seçilen müdürlüktür."
      maddeler={[
        { baslik: 'Yıl', metin: 'Varsayılan bir sonraki takvim yılıdır.' },
        { baslik: 'Tablo', metin: 'Tüm programlar tek başlık altında listelenir.' },
        { baslik: 'Müdürlük', metin: 'Göstergenin bağlı olduğu hedefin seçilen müdürlüğüdür.' },
      ]}
      listeYol={LISTE}
      gorYol={GOR}
      excelYol={EXCEL}
      yil={rapor.yil}
      yillar={rapor.yillar}
      ozetEtiket="Satır"
      ozetDeger={rapor.satirlar.length}
    />
  )
}
