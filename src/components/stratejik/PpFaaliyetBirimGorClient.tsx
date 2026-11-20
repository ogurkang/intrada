'use client'

import type { PpFaaliyetBirimRapor } from '@/lib/pp-faaliyet-birim-rapor'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import { PpRaporGorKabuk } from '@/components/stratejik/PpRaporYilListeKabuk'
import PpFaaliyetBirimTablo from '@/components/stratejik/PpFaaliyetBirimTablo'

const LISTE = `${PP_RAPORLAR_BASE}/faaliyetlerden-sorumlu-harcama-birimleri`
const EXCEL = '/api/performans-programi/raporlar/faaliyet-birim/excel'

export default function PpFaaliyetBirimGorClient({ rapor }: { rapor: PpFaaliyetBirimRapor }) {
  return (
    <PpRaporGorKabuk
      baslik="Faaliyetlerden Sorumlu Harcama Birimleri"
      altBaslik={`${rapor.yil} — her program ayrı tablo`}
      maddeler={[
        { baslik: 'Programlar', metin: 'Her programdan sonra boşluk; başlık yeniden yazılır (Excel’de de).' },
        { baslik: 'Renk', metin: 'İdare performans tablosuyla aynı mavi–yeşil–gri grup renkleri.' },
      ]}
      listeYol={LISTE}
      excelYol={EXCEL}
      yil={rapor.yil}
    >
      <PpFaaliyetBirimTablo bloklar={rapor.bloklar} />
    </PpRaporGorKabuk>
  )
}
