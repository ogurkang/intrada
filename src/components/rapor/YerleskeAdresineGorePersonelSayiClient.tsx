'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import type { YerleskePersonelSayiSatir } from '@/lib/rapor-yerleske-adresine-gore-personel-sayi'

export interface YerleskePersonelSayiTabVerisi {
  periyot: RaporPeriyot
  label: string
  sonGunuEtiket: string
  satirlar: YerleskePersonelSayiSatir[]
  gelenler: string[]
  ayrilanlar: string[]
}

interface Props {
  yil: number
  minYil: number
  maxYil: number
  tabs: YerleskePersonelSayiTabVerisi[]
  raporBasePath?: string
  excelBasePath?: string
  baslik?: string
  aciklama?: string
}

export default function YerleskeAdresineGorePersonelSayiClient({
  yil,
  minYil,
  maxYil,
  tabs,
  raporBasePath = '/rapor/yerleske-adresine-gore-personel-sayi',
  excelBasePath = '/api/rapor/yerleske-adresine-gore-personel-sayi/excel',
  baslik = 'Yerleşke Adresine Göre Personel Sayısı',
  aciklama = 'Müdürlük–yerleşke eşlemesine göre aktif personel sayıları.',
}: Props) {
  const router = useRouter()
  const [sekmeIndex, setSekmeIndex] = useState(0)
  const aktif = tabs[sekmeIndex]

  const tablo = useMemo(() => {
    if (!aktif) return { satirlar: [] as YerleskePersonelSayiSatir[], toplamAdabel: 0, toplamBelediye: 0, toplamGenel: 0 }
    let toplamAdabel = 0
    let toplamBelediye = 0
    let toplamGenel = 0
    for (const s of aktif.satirlar) {
      toplamAdabel += s.adabel
      toplamBelediye += s.belediye
      toplamGenel += s.toplam
    }
    return { satirlar: aktif.satirlar, toplamAdabel, toplamBelediye, toplamGenel }
  }, [aktif])

  const yilDegistir = useCallback(
    (y: number) => {
      router.push(`${raporBasePath}?y=${y}`)
    },
    [router, raporBasePath],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/rapor"
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
          >
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">{aciklama}</p>
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
          <div className="space-y-1">
            <p className="text-xs text-slate-500">
              Anlık görüntü tarihi: <strong className="text-slate-700">{aktif.sonGunuEtiket}</strong>
            </p>
            <p className="text-xs font-semibold text-slate-700">ADABEL&apos;de çalışanlar hariç</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-16">Sıra No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Müdürlük Adı</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Yerleşke Adı</th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-20">Konum</th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-36">ADABEL Personel Sayısı</th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-40">Belediye Personel Sayısı</th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-24">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {tablo.satirlar.map((row, ri) => (
                    <tr key={`${row.mudurlukId}-${row.yerleskeId}-${ri}`} className="border-b border-slate-100">
                      <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{ri + 1}</td>
                      <td className="px-4 py-2.5 text-slate-800">{row.mudurlukAdi}</td>
                      <td className="px-4 py-2.5 text-slate-800">{row.yerleskeAdi}</td>
                      <td className="px-3 py-2.5 text-center text-slate-700">{row.konum || '—'}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-slate-800">{row.adabel}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-slate-800">{row.belediye}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums font-medium text-slate-900">{row.toplam}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-semibold border-t-2 border-slate-200">
                    <td className="px-3 py-3 text-center text-slate-500">—</td>
                    <td className="px-4 py-3 text-slate-900" colSpan={3}>
                      Toplam
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-slate-900">{tablo.toplamAdabel}</td>
                    <td className="px-3 py-3 text-center tabular-nums text-slate-900">{tablo.toplamBelediye}</td>
                    <td className="px-3 py-3 text-center tabular-nums text-slate-900">{tablo.toplamGenel}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Gelenler:</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {aktif.gelenler.length > 0 ? aktif.gelenler.join(', ') : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Ayrılanlar:</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {aktif.ayrilanlar.length > 0 ? aktif.ayrilanlar.join(', ') : '—'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
