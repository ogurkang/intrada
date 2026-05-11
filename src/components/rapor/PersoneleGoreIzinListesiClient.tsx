'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

interface PersoneleGoreIzinSatir {
  sicil_no: string
  ad_soyad: string
  mudurluk: string
  kayit_bilgisi: string
  tur: string
  gun: number
}

type SortKey = 'sicil_no' | 'ad_soyad' | 'mudurluk' | 'kayit_bilgisi' | 'tur' | 'gun'
type SortDir = 'asc' | 'desc'

interface Props {
  yil: number
  minYil: number
  maxYil: number
  satirlar: PersoneleGoreIzinSatir[]
  tumMudurlukler: string[]
  tumTurler: string[]
  raporBasePath: string
  excelBasePath: string
}

function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir) return <span className="ml-1 text-slate-400 text-xs">↕</span>
  return <span className="ml-1 text-teal-700 text-xs">{dir === 'asc' ? '↑' : '↓'}</span>
}

export default function PersoneleGoreIzinListesiClient({
  yil,
  minYil,
  maxYil,
  satirlar,
  tumMudurlukler,
  tumTurler,
  raporBasePath,
  excelBasePath,
}: Props) {
  const router = useRouter()
  const [mudurlukFiltreler, setMudurlukFiltreler] = useState<string[]>([])
  const [sicilFiltre, setSicilFiltre] = useState('')
  const [turFiltre, setTurFiltre] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('sicil_no')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(key)
        setSortDir('asc')
      }
    },
    [sortKey],
  )

  const gorunenSatirlar = useMemo(() => {
    let rows = satirlar
    if (mudurlukFiltreler.length > 0) {
      const set = new Set(mudurlukFiltreler)
      rows = rows.filter(r => set.has(r.mudurluk))
    }
    const sicilTrim = sicilFiltre.trim().toLocaleLowerCase('tr-TR')
    if (sicilTrim) {
      rows = rows.filter(
        r =>
          r.sicil_no.toLocaleLowerCase('tr-TR').includes(sicilTrim) ||
          r.ad_soyad.toLocaleLowerCase('tr-TR').includes(sicilTrim),
      )
    }
    if (turFiltre) {
      rows = rows.filter(r => r.tur === turFiltre)
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sortKey === 'gun') return (a.gun - b.gun) * dir
      return a[sortKey].localeCompare(b[sortKey], 'tr', { numeric: sortKey === 'sicil_no' }) * dir
    })
  }, [satirlar, mudurlukFiltreler, sicilFiltre, turFiltre, sortKey, sortDir])

  const yilDegistir = useCallback(
    (y: number) => router.push(`${raporBasePath}?y=${y}`),
    [router, raporBasePath],
  )

  const excelParams = useMemo(() => {
    const p = new URLSearchParams({ y: String(yil) })
    if (mudurlukFiltreler.length) p.set('m', mudurlukFiltreler.join(','))
    if (sicilFiltre.trim()) p.set('s', sicilFiltre.trim())
    if (turFiltre) p.set('t', turFiltre)
    return p.toString()
  }, [yil, mudurlukFiltreler, sicilFiltre, turFiltre])

  const thClass = (key: SortKey) =>
    `px-4 py-3 font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-100 transition-colors whitespace-nowrap ${
      sortKey === key ? 'text-teal-800' : ''
    }`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/rapor"
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
          >
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Personele Göre Kullanılan İzin Listesi</h1>
          <p className="text-sm text-slate-600 mt-1">
            Seçili yılda kullanılan izinler; müdürlük, sicil ve türe göre filtrelenebilir.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
          <Link
            href={`${excelBasePath}?${excelParams}`}
            className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            Excel İndir
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-4">
        {/* Yıl */}
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

        {/* Müdürlük */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 whitespace-nowrap">Müdürlük</label>
          <details className="relative">
            <summary className="list-none cursor-pointer min-w-[200px] max-w-[280px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700">
              {mudurlukFiltreler.length ? `${mudurlukFiltreler.length} müdürlük seçili` : 'Tümü'}
            </summary>
            <div className="absolute left-0 z-10 mt-1 w-80 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
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
        </div>

        {/* Sicil / Ad */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 whitespace-nowrap">Sicil / Ad</label>
          <input
            type="text"
            value={sicilFiltre}
            onChange={e => setSicilFiltre(e.target.value)}
            placeholder="Ara…"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 w-40"
          />
        </div>

        {/* Tür */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 whitespace-nowrap">Tür</label>
          <select
            value={turFiltre}
            onChange={e => setTurFiltre(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 max-w-[200px]"
          >
            <option value="">Tümü</option>
            {tumTurler.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Sonuç sayısı */}
        <span className="ml-auto text-sm text-slate-500">
          {gorunenSatirlar.length} kayıt
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-center px-3 py-3 font-semibold text-slate-700 w-16">Sıra No</th>
                <th
                  className={`text-left ${thClass('sicil_no')} w-28`}
                  onClick={() => handleSort('sicil_no')}
                >
                  Sicil No
                  <SortIcon dir={sortKey === 'sicil_no' ? sortDir : null} />
                </th>
                <th
                  className={`text-left ${thClass('ad_soyad')} min-w-[200px]`}
                  onClick={() => handleSort('ad_soyad')}
                >
                  Adı Soyadı
                  <SortIcon dir={sortKey === 'ad_soyad' ? sortDir : null} />
                </th>
                <th
                  className={`text-left ${thClass('kayit_bilgisi')} min-w-[180px]`}
                  onClick={() => handleSort('kayit_bilgisi')}
                >
                  Kayıt Bilgisi
                  <SortIcon dir={sortKey === 'kayit_bilgisi' ? sortDir : null} />
                </th>
                <th
                  className={`text-left ${thClass('tur')} min-w-[160px]`}
                  onClick={() => handleSort('tur')}
                >
                  İzin Türü
                  <SortIcon dir={sortKey === 'tur' ? sortDir : null} />
                </th>
                <th
                  className={`text-right ${thClass('gun')} w-28`}
                  onClick={() => handleSort('gun')}
                >
                  Gün Bilgisi
                  <SortIcon dir={sortKey === 'gun' ? sortDir : null} />
                </th>
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
                  <tr
                    key={`${row.sicil_no}-${row.kayit_bilgisi}-${i}`}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{row.sicil_no}</td>
                    <td className="px-4 py-2.5 text-slate-800">{row.ad_soyad}</td>
                    <td className="px-4 py-2.5 text-slate-700 text-xs tabular-nums">{row.kayit_bilgisi}</td>
                    <td className="px-4 py-2.5 text-slate-700">{row.tur}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-800">
                      {row.gun}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {gorunenSatirlar.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200 font-semibold">
                  <td colSpan={5} className="px-4 py-2.5 text-slate-700">
                    Toplam ({gorunenSatirlar.length} kayıt)
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-800">
                    {gorunenSatirlar.reduce((s, r) => s + r.gun, 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
