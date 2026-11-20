'use client'

import type { PpGostergeBirimRapor } from '@/lib/pp-gosterge-birim-rapor'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import { PpRaporGorKabuk } from '@/components/stratejik/PpRaporYilListeKabuk'
import PpGostergeBirimTablo from '@/components/stratejik/PpGostergeBirimTablo'

const LISTE = `${PP_RAPORLAR_BASE}/performans-gostergeleri-izleme-birimleri`
const EXCEL = '/api/performans-programi/raporlar/gosterge-birim/excel'

export default function PpGostergeBirimGorClient({ rapor }: { rapor: PpGostergeBirimRapor }) {
  return (
    <PpRaporGorKabuk
      baslik="Gösterge İzleme Sorumlu Birimleri"
      altBaslik={`${rapor.yil} — programlar tek tabloda`}
      maddeler={[
        { baslik: 'Yapı', metin: 'Program / alt program / gösterge kodu-adı / ilgili müdürlük.' },
        { baslik: 'Excel', metin: 'Tek başlık; programlar alt alta, ekstra boş satır yok.' },
      ]}
      listeYol={LISTE}
      excelYol={EXCEL}
      yil={rapor.yil}
    >
      <PpGostergeBirimTablo satirlar={rapor.satirlar} />
    </PpRaporGorKabuk>
  )
}
