'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PpFaaliyetMaliyetRapor } from '@/lib/pp-faaliyet-maliyet-rapor'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import PpEkranBilgi from '@/components/stratejik/PpEkranBilgi'
import PpRaporGoz from '@/components/stratejik/PpRaporGoz'
import { IntradaLoader } from '@/components/ui/IntradaLoader'

const LISTE_YOL = `${PP_RAPORLAR_BASE}/faaliyetler-duzeyinde-idare-pp-maliyeti`
const EXCEL = '/api/performans-programi/raporlar/faaliyet-maliyet/excel'
const GOR_YOL = `${LISTE_YOL}/gor`

export default function PpFaaliyetDuzeyiMaliyetListeClient({
  rapor,
}: {
  rapor: PpFaaliyetMaliyetRapor
}) {
  const router = useRouter()
  const [yukleniyor, setYukleniyor] = useState(false)

  useEffect(() => {
    setYukleniyor(false)
  }, [rapor.yil, rapor.satirlar.length])

  function yilDegistir(y: string) {
    setYukleniyor(true)
    router.push(`${LISTE_YOL}?y=${encodeURIComponent(y)}`)
  }

  const gor = `${GOR_YOL}?y=${rapor.yil}`
  const excel = `${EXCEL}?yil=${rapor.yil}`

  return (
    <div className="space-y-6 relative">
      {yukleniyor ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-white/75 backdrop-blur-[1px]"
          role="alert"
          aria-busy="true"
          aria-label="Rapor yükleniyor"
        >
          <IntradaLoader label="Rapor yükleniyor" />
        </div>
      ) : null}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">
              Faaliyetler Düzeyinde İdare Performans Programı Maliyeti Tablosu
            </h1>
            <PpEkranBilgi maddeler={[
              { baslik: 'Yıl', metin: 'Varsayılan olarak bir sonraki takvim yılıdır. Tablo seçili yıl, yıl+1 ve yıl+2 BÜTÇE İÇİ sütunlarını gösterir.' },
              { baslik: 'Göz', metin: 'Program → alt program → faaliyet hiyerarşisindeki maliyet tablosunu açar.' },
              { baslik: 'İndir', metin: 'Aynı tablonun Excel dosyasını indirir.' },
            ]} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Faaliyet toplamları alt programa, alt program toplamları programa yazılır. Üç yıl BÜTÇE İÇİ; ekonomik sınıflandırma yoktur.
          </p>
        </div>
        <Link
          href={PP_RAPORLAR_BASE}
          className="inline-flex shrink-0 items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 self-start"
        >
          ← Raporlar
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-sm text-slate-700">
          <span className="mb-1 block font-medium">Yıl</span>
          <select
            value={rapor.yil}
            onChange={e => yilDegistir(e.target.value)}
            className="min-w-[7rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {rapor.yillar.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="w-16 px-4 py-3 text-center">Sıra</th>
              <th className="px-4 py-3 text-left">Tablo</th>
              <th className="w-28 px-4 py-3 text-center">Yıl</th>
              <th className="w-36 px-4 py-3 text-center">Satır</th>
              <th className="w-28 px-4 py-3 text-center">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr className="hover:bg-slate-50/80">
              <td className="px-4 py-3 text-center text-slate-600">1</td>
              <td className="px-4 py-3 text-slate-800">
                Faaliyetler Düzeyinde İdare Performans Programı Maliyeti
              </td>
              <td className="px-4 py-3 text-center text-slate-700">{rapor.yil}</td>
              <td className="px-4 py-3 text-center text-slate-600">{rapor.satirlar.length}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-1">
                  <PpRaporGoz href={gor} />
                  <a
                    href={excel}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50"
                    title="Excel indir"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
