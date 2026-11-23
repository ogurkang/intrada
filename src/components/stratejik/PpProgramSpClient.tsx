'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PpProgramSpRapor } from '@/lib/pp-program-sp-rapor'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import PpEkranBilgi from '@/components/stratejik/PpEkranBilgi'
import { IntradaLoader } from '@/components/ui/IntradaLoader'

const LISTE_YOL = `${PP_RAPORLAR_BASE}/program-alt-program-stratejik-plan`
const EXCEL = '/api/performans-programi/raporlar/program-sp/excel'

const HUCRE = 'border border-slate-300 px-3 py-2.5 align-middle text-sm'
const BASLIK = 'border border-slate-300 bg-[#9DC3E6] px-3 py-2.5 text-center text-sm font-bold text-slate-900'

export default function PpProgramSpClient({
  rapor,
}: {
  rapor: PpProgramSpRapor
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
              Program-Alt Program Stratejik Plan Tablosu
            </h1>
            <PpEkranBilgi maddeler={[
              { baslik: 'Yıl', metin: 'Performans programı yılı. Varsayılan bir sonraki takvim yılıdır.' },
              { baslik: 'İçerik', metin: 'Program, alt program, bağlı performans hedefi ve stratejik amaç ilişkisi.' },
              { baslik: 'Excel', metin: 'Ekrandaki tabloyu aynı sütunlarla indirir.' },
            ]} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Program–alt program ile stratejik plandaki performans hedefi ve amaç bağlantısı.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href={PP_RAPORLAR_BASE}
            className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            ← Raporlar
          </Link>
          <a
            href={excel}
            className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Excel İndir
          </a>
        </div>
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

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse min-w-[48rem]">
          <thead>
            <tr>
              <th className={`${BASLIK} w-20`}>Sıra No</th>
              <th className={BASLIK}>Program Adı</th>
              <th className={BASLIK}>Alt Program Adı</th>
              <th className={BASLIK}>Performans Hedefi</th>
              <th className={BASLIK}>Stratejik Amaç</th>
            </tr>
          </thead>
          <tbody>
            {rapor.satirlar.length === 0 ? (
              <tr>
                <td colSpan={5} className={`${HUCRE} py-10 text-center text-slate-500`}>
                  Seçilen yıl için program–stratejik plan bağlantısı yok.
                </td>
              </tr>
            ) : rapor.satirlar.map((s, i) => {
              const zemin = i % 2 === 0 ? 'bg-[#C6EFCE]' : 'bg-[#F2F2F2]'
              return (
                <tr key={`${s.programAdi}-${s.altProgramAdi}-${s.hedefKod}-${i}`}>
                  <td className={`${HUCRE} text-center tabular-nums ${zemin}`}>{i + 1}</td>
                  <td className={`${HUCRE} ${zemin}`}>{s.programAdi}</td>
                  <td className={`${HUCRE} ${zemin}`}>{s.altProgramAdi}</td>
                  <td className={`${HUCRE} ${zemin}`}>{s.performansHedefi}</td>
                  <td className={`${HUCRE} ${zemin}`}>{s.stratejikAmac}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
