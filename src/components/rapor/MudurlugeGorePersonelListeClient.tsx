'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import type { MudurlugeGorePersonelSatir } from '@/lib/rapor-mudurluge-gore-personel-liste'

export interface MudurlugeGorePersonelTabVerisi {
  periyot: RaporPeriyot
  label: string
  sonGunuEtiket: string
  satirlar: MudurlugeGorePersonelSatir[]
}

interface Props {
  yil: number
  minYil: number
  maxYil: number
  tabs: MudurlugeGorePersonelTabVerisi[]
  tumMudurlukler: string[]
  initialMudurluk: string
  raporBasePath: string
  excelBasePath: string
}

export default function MudurlugeGorePersonelListeClient({
  yil,
  minYil,
  maxYil,
  tabs,
  tumMudurlukler,
  initialMudurluk,
  raporBasePath,
  excelBasePath,
}: Props) {
  const router = useRouter()
  const [sekmeIndex, setSekmeIndex] = useState(0)
  const [mudurlukFiltre, setMudurlukFiltre] = useState(initialMudurluk)
  const aktif = tabs[sekmeIndex]

  const gorunenSatirlar = useMemo(() => {
    if (!aktif) return [] as MudurlugeGorePersonelSatir[]
    const mud = mudurlukFiltre.trim()
    if (!mud) return aktif.satirlar
    return aktif.satirlar.filter(r => r.mudurluk === mud)
  }, [aktif, mudurlukFiltre])

  const yilDegistir = useCallback(
    (y: number) => {
      const mud = mudurlukFiltre.trim()
      const q = mud ? `?y=${y}&m=${encodeURIComponent(mud)}` : `?y=${y}`
      router.push(`${raporBasePath}${q}`)
    },
    [router, raporBasePath, mudurlukFiltre],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="max-w-4xl">
          <Link href="/rapor" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2">
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Müdürlüğe Göre Personel Listesi</h1>
          <p className="text-sm text-slate-600 mt-1">
            Kadro hareketlerindeki Kadro Müdürlüğü alanına göre anlık personel listesi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {aktif && (
            <Link
              href={`${excelBasePath}?y=${yil}&p=${aktif.periyot === 'yillik' ? 'yillik' : aktif.periyot}${mudurlukFiltre.trim() ? `&m=${encodeURIComponent(mudurlukFiltre.trim())}` : ''}`}
              className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              Excel İndir ({aktif.label})
            </Link>
          )}
          <label className="text-sm text-slate-600 whitespace-nowrap">Müdürlük</label>
          <select
            value={mudurlukFiltre}
            onChange={e => setMudurlukFiltre(e.target.value)}
            className="min-w-[220px] max-w-[min(100vw-2rem,340px)] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="">Tümü</option>
            {tumMudurlukler.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
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
              <table className="w-full text-sm border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-20">Sıra No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-32">Sicil No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[220px]">Adı Soyadı</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[260px]">Müdürlük</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gorunenSatirlar.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                        Kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    gorunenSatirlar.map((row, i) => (
                      <tr key={`${row.sicil_no}-${row.ad_soyad}-${row.mudurluk}-${i}`} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{i + 1}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{row.sicil_no}</td>
                        <td className="px-4 py-2.5 text-slate-800">{row.ad_soyad}</td>
                        <td className="px-4 py-2.5 text-slate-700">{row.mudurluk}</td>
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
