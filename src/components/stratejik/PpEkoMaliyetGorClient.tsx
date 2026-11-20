'use client'

import type { PpEkoMaliyetRapor } from '@/lib/pp-eko-maliyet-rapor'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import { PpRaporGorKabuk } from '@/components/stratejik/PpRaporYilListeKabuk'
import PpEkoMaliyetTablo from '@/components/stratejik/PpEkoMaliyetTablo'

const LISTE = `${PP_RAPORLAR_BASE}/ekonomik-siniflandirma-duzeyinde-pp-maliyeti`
const EXCEL = '/api/performans-programi/raporlar/eko-maliyet/excel'

export default function PpEkoMaliyetGorClient({ rapor }: { rapor: PpEkoMaliyetRapor }) {
  return (
    <PpRaporGorKabuk
      baslik="Ekonomik Sınıflandırma PP Maliyeti"
      altBaslik={`${rapor.yil} — ${rapor.yil + 2} · hizmet / yönetim-destek / genel`}
      maddeler={[
        { baslik: 'Hizmet', metin: 'Yönetim ve Destek hariç programların toplamı.' },
        { baslik: 'Yönetim ve Destek', metin: 'Yalnızca o programın tutarları.' },
        { baslik: 'Excel', metin: 'Tutarlar #.##0,00 (TR) biçimindedir.' },
      ]}
      listeYol={LISTE}
      excelYol={EXCEL}
      yil={rapor.yil}
    >
      <PpEkoMaliyetTablo rapor={rapor} />
    </PpRaporGorKabuk>
  )
}
