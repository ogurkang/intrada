'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import PpEkranBilgi from '@/components/stratejik/PpEkranBilgi'
import PpRaporGoz from '@/components/stratejik/PpRaporGoz'
import { IntradaLoader } from '@/components/ui/IntradaLoader'

export default function PpRaporYilListeKabuk({
  baslik,
  aciklama,
  maddeler,
  listeYol,
  gorYol,
  excelYol,
  yil,
  yillar,
  ozetEtiket,
  ozetDeger,
}: {
  baslik: string
  aciklama: string
  maddeler: { baslik: string; metin: string }[]
  listeYol: string
  gorYol: string
  excelYol: string
  yil: number
  yillar: number[]
  ozetEtiket: string
  ozetDeger: string | number
}) {
  const router = useRouter()
  const [yukleniyor, setYukleniyor] = useState(false)

  useEffect(() => {
    setYukleniyor(false)
  }, [yil, ozetDeger])

  function yilDegistir(y: string) {
    setYukleniyor(true)
    router.push(`${listeYol}?y=${encodeURIComponent(y)}`)
  }

  const gor = `${gorYol}?y=${yil}`
  const excel = `${excelYol}?yil=${yil}`

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
            <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
            <PpEkranBilgi maddeler={maddeler} />
          </div>
          <p className="mt-1 text-sm text-slate-600">{aciklama}</p>
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
            value={yil}
            onChange={e => yilDegistir(e.target.value)}
            className="min-w-[7rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {yillar.map(y => <option key={y} value={y}>{y}</option>)}
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
              <th className="w-36 px-4 py-3 text-center">{ozetEtiket}</th>
              <th className="w-28 px-4 py-3 text-center">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr className="hover:bg-slate-50/80">
              <td className="px-4 py-3 text-center text-slate-600">1</td>
              <td className="px-4 py-3 text-slate-800">{baslik}</td>
              <td className="px-4 py-3 text-center text-slate-700">{yil}</td>
              <td className="px-4 py-3 text-center text-slate-600">{ozetDeger}</td>
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

export function PpRaporGorKabuk({
  baslik,
  altBaslik,
  maddeler,
  listeYol,
  excelYol,
  yil,
  children,
}: {
  baslik: string
  altBaslik: string
  maddeler: { baslik: string; metin: string }[]
  listeYol: string
  excelYol: string
  yil: number
  children: ReactNode
}) {
  const listeQ = new URLSearchParams({ y: String(yil) })
  const excel = `${excelYol}?yil=${yil}`
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
            <PpEkranBilgi maddeler={maddeler} />
          </div>
          <p className="mt-1 text-sm text-slate-600">{altBaslik}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href={`${listeYol}?${listeQ}`}
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
      {children}
    </div>
  )
}
