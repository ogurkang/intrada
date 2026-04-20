'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { IsciIzinRaporTabVerisi } from '@/lib/rapor-isci-izinleri'

interface Props {
  yil: number
  minYil: number
  maxYil: number
  tabs: IsciIzinRaporTabVerisi[]
  raporBasePath: string
  excelBasePath: string
  baslik: string
  aciklama: string
}

export default function IsciIzinleriRaporClient({
  yil,
  minYil,
  maxYil,
  tabs,
  raporBasePath,
  excelBasePath,
  baslik,
  aciklama,
}: Props) {
  const router = useRouter()
  const [sekmeIndex, setSekmeIndex] = useState(0)
  const aktif = tabs[sekmeIndex]

  const yilDegistir = useCallback(
    (y: number) => {
      router.push(`${raporBasePath}?y=${y}`)
    },
    [router, raporBasePath],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="max-w-4xl">
          <Link href="/rapor" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2">
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
          <p className="text-sm text-slate-600 mt-1">{aciklama}</p>
        </div>
        <div className="flex items-center gap-2">
          {aktif && (
            <Link
              href={`${excelBasePath}?y=${yil}&p=${aktif.periyot === 'yillik' ? 'yillik' : aktif.periyot}`}
              className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              Excel İndir ({aktif.label})
            </Link>
          )}
          <label className="text-sm text-slate-600 whitespace-nowrap">Yıl</label>
          <select
            value={yil}
            onChange={e => yilDegistir(Number(e.target.value))}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            {Array.from({ length: maxYil - minYil + 1 }, (_, i) => minYil + i).map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-0 min-w-max" aria-label="Dönem sekmeleri">
          {tabs.map((t, i) => (
            <button
              key={`${t.label}-${i}`}
              type="button"
              onClick={() => setSekmeIndex(i)}
              className={`px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                sekmeIndex === i
                  ? 'border-teal-600 text-teal-800 bg-teal-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {aktif && (
        <>
          <p className="text-xs text-slate-500">
            Anlık görüntü tarihi: <strong className="text-slate-700">{aktif.sonGunuEtiket}</strong>
          </p>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[980px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-20">Sıra No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Sicil No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Adı Soyadı</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-700">Devreden İzin</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-700">Hak Edilen İzin</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-700">Kullanılan İzin</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-700">Kalan İzin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aktif.satirlar.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                        Seçili dönemde İşçi statüsünde aktif personel kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    aktif.satirlar.map((r, i) => (
                      <tr key={`${r.sicil_no}-${i}`}>
                        <td className="px-4 py-2.5 text-slate-700 tabular-nums">{i + 1}</td>
                        <td className="px-4 py-2.5 text-slate-700 font-mono text-xs">{r.sicil_no}</td>
                        <td className="px-4 py-2.5 text-slate-800">{r.ad_soyad}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-slate-800">{r.devreden_izin}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-slate-800">{r.hak_edilen_izin}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-slate-800">{r.kullanilan_izin}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-slate-900 font-medium">{r.kalan_izin}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
