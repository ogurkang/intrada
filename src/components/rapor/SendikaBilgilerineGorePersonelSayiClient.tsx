'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import type { SendikaPersonelSayiSatir } from '@/lib/rapor-sendika-bilgileri'

export interface SendikaPersonelSayiTabVerisi {
  periyot: RaporPeriyot
  label: string
  sonGunuEtiket: string
  satirlar: SendikaPersonelSayiSatir[]
}

interface Props {
  yil: number
  minYil: number
  maxYil: number
  tabs: SendikaPersonelSayiTabVerisi[]
}

export default function SendikaBilgilerineGorePersonelSayiClient({ yil, minYil, maxYil, tabs }: Props) {
  const router = useRouter()
  const [sekmeIndex, setSekmeIndex] = useState(0)
  const aktif = tabs[sekmeIndex]

  const toplam = useMemo(() => (aktif ? aktif.satirlar.reduce((a, s) => a + s.sayi, 0) : 0), [aktif])

  const yilDegistir = useCallback(
    (y: number) => {
      router.push(`/rapor/sendika-bilgilerine-gore-personel-sayi?y=${y}`)
    },
    [router],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/rapor" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2">
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Sendika Bilgilerine Göre Personel Sayısı</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Sendika başına üye sayısı; en fazla üyesi olan sendika en üstte.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {aktif && (
            <Link
              href={`/api/rapor/sendika-bilgilerine-gore-personel-sayi/excel?y=${yil}&p=${aktif.periyot === 'yillik' ? 'yillik' : aktif.periyot}`}
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
              <table className="w-full text-sm border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-20">Sıra No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-28">Statü</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-40">Kısa Ad</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[280px]">Uzun Ad</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-700 w-28">Personel Sayısı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aktif.satirlar.map((row, i) => (
                    <tr key={row.sendika_id} className="hover:bg-slate-50/80">
                      <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{i + 1}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.statu}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{row.kisa_ad}</td>
                      <td className="px-4 py-2.5 text-slate-600">{row.uzun_ad}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums font-medium text-slate-900">{row.sayi}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-semibold border-t-2 border-slate-200">
                    <td className="px-3 py-3 text-center text-slate-500">—</td>
                    <td className="px-4 py-3 text-slate-900" colSpan={3}>
                      Toplam
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-slate-900">{toplam}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
