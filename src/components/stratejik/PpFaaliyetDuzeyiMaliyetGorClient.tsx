'use client'

import Link from 'next/link'
import type { PpFaaliyetMaliyetRapor } from '@/lib/pp-faaliyet-maliyet-rapor'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import PpEkranBilgi from '@/components/stratejik/PpEkranBilgi'
import PpFaaliyetDuzeyiMaliyetTablo from '@/components/stratejik/PpFaaliyetDuzeyiMaliyetTablo'

const LISTE_YOL = `${PP_RAPORLAR_BASE}/faaliyetler-duzeyinde-idare-pp-maliyeti`
const EXCEL = '/api/performans-programi/raporlar/faaliyet-maliyet/excel'

export default function PpFaaliyetDuzeyiMaliyetGorClient({
  rapor,
}: {
  rapor: PpFaaliyetMaliyetRapor
}) {
  const listeQ = new URLSearchParams({ y: String(rapor.yil) })
  const excel = `${EXCEL}?yil=${rapor.yil}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">
              Faaliyetler Düzeyinde İdare PP Maliyeti
            </h1>
            <PpEkranBilgi maddeler={[
              { baslik: 'Hiyerarşi', metin: 'PROGRAM → ALT PROGRAM → FAALİYET. Faaliyet tutarları yukarı toplanır.' },
              { baslik: 'Yıllar', metin: `Seçili yıl (${rapor.yil}) ve bir sonraki yıl (${rapor.yil + 1}) BÜTÇE İÇİ sütunlarıdır.` },
              { baslik: 'Excel İndir', metin: 'Şablondaki renk, birleştirme ve ölçülerle Excel üretir.' },
            ]} />
          </div>
          <p className="mt-1 text-sm text-slate-600">{rapor.yil} yılı — ekonomik sınıflandırma yok</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href={`${LISTE_YOL}?${listeQ}`}
            className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            ← Liste
          </Link>
          <a
            href={excel}
            className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Excel İndir
          </a>
        </div>
      </div>

      <PpFaaliyetDuzeyiMaliyetTablo yil={rapor.yil} satirlar={rapor.satirlar} />
    </div>
  )
}
