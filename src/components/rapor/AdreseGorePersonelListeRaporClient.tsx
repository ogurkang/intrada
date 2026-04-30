'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import type { AdreseGorePersonelListeSatir } from '@/lib/rapor-adrese-gore-personel-liste'

export interface AdreseGorePersonelListeTabVerisi {
  periyot: RaporPeriyot
  label: string
  sonGunuEtiket: string
  satirlar: AdreseGorePersonelListeSatir[]
}

interface Props {
  yil: number
  minYil: number
  maxYil: number
  tabs: AdreseGorePersonelListeTabVerisi[]
  raporBasePath: string
  excelBasePath?: string
  baslik: string
  aciklama: string
}

export default function AdreseGorePersonelListeRaporClient({
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
        <div className="max-w-3xl">
          <Link href="/rapor" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2">
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
          <p className="text-sm text-slate-600 mt-1">{aciklama}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-end">
          {aktif && excelBasePath && (
            <Link
              href={`${excelBasePath}?y=${yil}&p=${aktif.periyot === 'yillik' ? 'yillik' : aktif.periyot}`}
              className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              Excel İndir ({aktif.label})
            </Link>
          )}
          <div className="flex items-center gap-2">
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
              <table className="w-full text-sm border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-16">Sıra No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-28">Sicil No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[180px]">Adı Soyadı</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[150px]">Görev Unvanı</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[260px]">Adres Bilgisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aktif.satirlar.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                        Bu dönem ve tarih için kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    aktif.satirlar.map((row, i) => (
                      <tr key={`${row.sicil_no}-${row.ad_soyad}-${i}`} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{i + 1}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{row.sicil_no}</td>
                        <td className="px-4 py-2.5 text-slate-800">{row.ad_soyad}</td>
                        <td className="px-4 py-2.5 text-slate-700">{row.gorev_unvani}</td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-normal break-words">{row.adres}</td>
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
