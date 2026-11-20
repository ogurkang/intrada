'use client'

import type { PpEkoMaliyetRapor } from '@/lib/pp-eko-maliyet-rapor'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import PpRaporYilListeKabuk from '@/components/stratejik/PpRaporYilListeKabuk'

const LISTE = `${PP_RAPORLAR_BASE}/ekonomik-siniflandirma-duzeyinde-pp-maliyeti`
const GOR = `${LISTE}/gor`
const EXCEL = '/api/performans-programi/raporlar/eko-maliyet/excel'

export default function PpEkoMaliyetListeClient({ rapor }: { rapor: PpEkoMaliyetRapor }) {
  return (
    <PpRaporYilListeKabuk
      baslik="Ekonomik Sınıflandırma Düzeyinde Performans Programı Maliyeti Tablosu"
      aciklama="Hizmet programları toplamı yönetim ve destek dışındaki programları; yönetim ve destek sütunu yalnızca o programı gösterir. Yıl / yıl+1 / yıl+2."
      maddeler={[
        { baslik: 'Yıl', metin: 'Varsayılan olarak bir sonraki takvim yılıdır. Her yıl için hizmet, yönetim-destek ve genel toplam sütunları vardır.' },
        { baslik: 'Hizmet', metin: 'Yönetim ve Destek Programı dışındaki tüm programların ekonomik 1. düzey ödenek toplamı.' },
        { baslik: 'Yönetim ve Destek', metin: 'Yalnızca Yönetim ve Destek Programı tutarları.' },
        { baslik: 'İndir', metin: 'Excel tutarları nokta binlik / virgül küsür (2 basamak) biçimindedir.' },
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
