'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StatuIzinRaporTabVerisi } from '@/lib/rapor-statu-izinleri'

interface Props {
  yil: number
  minYil: number
  maxYil: number
  tabs: StatuIzinRaporTabVerisi[]
  tumMudurlukler: string[]
  initialMudurlukler: string[]
  raporBasePath: string
  excelBasePath: string
  baslik: string
  aciklama: string
  statuEtiket: string
}

export default function StatuIzinleriRaporClient({
  yil,
  minYil,
  maxYil,
  tabs,
  tumMudurlukler,
  initialMudurlukler,
  raporBasePath,
  excelBasePath,
  baslik,
  aciklama,
  statuEtiket,
}: Props) {
  const router = useRouter()
  const [sekmeIndex, setSekmeIndex] = useState(0)
  const [mudurlukFiltreler, setMudurlukFiltreler] = useState<string[]>(initialMudurlukler)
  const aktif = tabs[sekmeIndex]

  const gorunenSatirlar = useMemo(() => {
    if (!aktif) return []
    if (!mudurlukFiltreler.length) return aktif.satirlar
    const secili = new Set(mudurlukFiltreler)
    return aktif.satirlar.filter(r => secili.has(r.mudurluk))
  }, [aktif, mudurlukFiltreler])

  const yilDegistir = useCallback(
    (y: number) => {
      const mud = mudurlukFiltreler.join(',')
      const q = mud ? `?y=${y}&m=${encodeURIComponent(mud)}` : `?y=${y}`
      router.push(`${raporBasePath}${q}`)
    },
    [router, raporBasePath, mudurlukFiltreler],
  )

  const excelMudurluk = mudurlukFiltreler.length
    ? `&m=${encodeURIComponent(mudurlukFiltreler.join(','))}`
    : ''

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
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {aktif && (
            <Link
              href={`${excelBasePath}?y=${yil}&p=${aktif.periyot === 'yillik' ? 'yillik' : aktif.periyot}${excelMudurluk}`}
              className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              Excel İndir ({aktif.label})
            </Link>
          )}
          <label className="text-sm text-slate-600 whitespace-nowrap">Müdürlük</label>
          <details className="relative">
            <summary className="list-none cursor-pointer min-w-[220px] max-w-[min(100vw-2rem,340px)] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700">
              {mudurlukFiltreler.length ? `${mudurlukFiltreler.length} müdürlük seçili` : 'Tümü'}
            </summary>
            <div className="absolute right-0 z-10 mt-1 w-80 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-slate-500">Checkbox ile seçiniz</p>
                <button
                  type="button"
                  onClick={() => setMudurlukFiltreler([])}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Temizle
                </button>
              </div>
              <div className="space-y-1.5">
                {tumMudurlukler.map(m => (
                  <label key={m} className="inline-flex items-center gap-2 text-xs text-slate-700 w-full">
                    <input
                      type="checkbox"
                      checked={mudurlukFiltreler.includes(m)}
                      onChange={e =>
                        setMudurlukFiltreler(prev =>
                          e.target.checked ? Array.from(new Set([...prev, m])) : prev.filter(x => x !== m),
                        )
                      }
                    />
                    {m}
                  </label>
                ))}
              </div>
            </div>
          </details>
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
            {aktif.periyot !== 'yillik' && (
              <span className="ml-2 text-amber-700">
                · Kullanılan izin yalnızca {aktif.label} ayındaki izinleri gösterir (yıl toplamı için YILLIK sekmesine bakın)
              </span>
            )}
            {mudurlukFiltreler.length > 0 && (
              <span className="ml-2 text-teal-700">
                · {gorunenSatirlar.length} kayıt (müdürlük filtresi uygulanmış)
              </span>
            )}
          </p>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[1080px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-20">Sıra No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Sicil No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Adı Soyadı</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Müdürlük</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-700">Devreden İzin</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-700">Hak Edilen İzin</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-700">Kullanılan İzin</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-700">Kalan İzin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gorunenSatirlar.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                        Seçili dönemde {statuEtiket} statüsünde aktif personel kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    gorunenSatirlar.map((r, i) => (
                      <tr key={`${r.sicil_no}-${i}`}>
                        <td className="px-4 py-2.5 text-slate-700 tabular-nums">{i + 1}</td>
                        <td className="px-4 py-2.5 text-slate-700 font-mono text-xs">{r.sicil_no}</td>
                        <td className="px-4 py-2.5 text-slate-800">{r.ad_soyad}</td>
                        <td className="px-4 py-2.5 text-slate-600 text-xs">{r.mudurluk}</td>
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
