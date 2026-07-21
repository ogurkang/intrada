'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import {
  ogrenimDurumunaGorePersonelFlatten,
  type OgrenimDurumunaGorePersonelSatir,
} from '@/lib/rapor-ogrenim-durumuna-gore-personel-liste'

export interface OgrenimDurumunaGorePersonelTabVerisi {
  periyot: RaporPeriyot
  label: string
  sonGunuEtiket: string
  satirlar: OgrenimDurumunaGorePersonelSatir[]
}

interface Props {
  yil: number
  minYil: number
  maxYil: number
  tabs: OgrenimDurumunaGorePersonelTabVerisi[]
  tumMudurlukler: string[]
  initialMudurlukler: string[]
  raporBasePath: string
  excelBasePath: string
}

export default function OgrenimDurumunaGorePersonelListeClient({
  yil,
  minYil,
  maxYil,
  tabs,
  tumMudurlukler,
  initialMudurlukler,
  raporBasePath,
  excelBasePath,
}: Props) {
  const router = useRouter()
  const [sekmeIndex, setSekmeIndex] = useState(0)
  const [mudurlukFiltreler, setMudurlukFiltreler] = useState<string[]>(initialMudurlukler)
  const aktif = tabs[sekmeIndex]

  const gorunenSatirlar = useMemo(
    () => {
      if (!aktif) return []
      const rows = ogrenimDurumunaGorePersonelFlatten(aktif.satirlar)
      if (!mudurlukFiltreler.length) return rows
      const secili = new Set(mudurlukFiltreler)
      return rows.filter(r => secili.has(r.mudurluk))
    },
    [aktif, mudurlukFiltreler],
  )

  const yilDegistir = useCallback(
    (y: number) => {
      const mud = mudurlukFiltreler.join(',')
      const q = mud ? `?y=${y}&m=${encodeURIComponent(mud)}` : `?y=${y}`
      router.push(`${raporBasePath}${q}`)
    },
    [router, raporBasePath, mudurlukFiltreler],
  )
  const excelMudurluk = mudurlukFiltreler.length ? `&m=${encodeURIComponent(mudurlukFiltreler.join(','))}` : ''

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="max-w-4xl">
          <Link href="/rapor" className="intrada-btn intrada-btn-ust-menu mb-2">
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Öğrenim Durumuna Göre Personel Listesi</h1>
          <p className="text-sm text-slate-600 mt-1">
            Önlisans ve üzeri birden fazla öğrenim kaydı olan personelde (ör. önlisans + lisans, lisans + yüksek lisans)
            kimlik sütunları satır birleştirme ile tek blok; tüm öğrenim satırları ayrı gösterilir.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {aktif && (
            <Link
              href={`${excelBasePath}?y=${yil}&p=${aktif.periyot === 'yillik' ? 'yillik' : aktif.periyot}${excelMudurluk}`}
              className="intrada-btn intrada-btn-excel"
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
                <button type="button" onClick={() => setMudurlukFiltreler([])} className="text-xs text-slate-500 hover:text-slate-700">
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
          </p>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-20">Sıra No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-32">Sicil No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[220px]">Adı Soyadı</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[220px]">Müdürlüğü</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-40">Öğrenim Durumu</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[260px]">Okul / Bölüm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gorunenSatirlar.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                        Kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    gorunenSatirlar.map((row, i) => (
                      <tr key={`${row.sicil_no}-${i}`} className="hover:bg-slate-50/80">
                        {row.grup_ilk_satir && (
                          <>
                            <td rowSpan={row.grup_satir_sayisi} className="px-3 py-2.5 text-center tabular-nums text-slate-600 align-top">
                              {row.sira_no}
                            </td>
                            <td rowSpan={row.grup_satir_sayisi} className="px-4 py-2.5 font-mono text-xs text-slate-700 align-top">
                              {row.sicil_no}
                            </td>
                            <td rowSpan={row.grup_satir_sayisi} className="px-4 py-2.5 text-slate-800 align-top">
                              {row.ad_soyad}
                            </td>
                            <td rowSpan={row.grup_satir_sayisi} className="px-4 py-2.5 text-slate-700 align-top">
                              {row.mudurluk}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-2.5 text-slate-700">{row.ogrenim_durumu}</td>
                        <td className="px-4 py-2.5 text-slate-700">{row.okul_bolum}</td>
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
