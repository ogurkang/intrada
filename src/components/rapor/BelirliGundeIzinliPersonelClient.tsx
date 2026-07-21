'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export interface BelirliGundeIzinliSatir {
  sicil_no: string
  ad_soyad: string
  statu: string
  mudurluk: string
  gorevlendirilen_kurum: string
  konum: string
  tur: string
  ayrilis: string
  baslama: string
}

type SortKey = 'sicil_no' | 'ad_soyad' | 'statu' | 'mudurluk' | 'gorevlendirilen_kurum' | 'konum' | 'tur' | 'ayrilis' | 'baslama'
type SortDir = 'asc' | 'desc'

interface Props {
  tarih: string
  satirlar: BelirliGundeIzinliSatir[]
  tumMudurlukler: string[]
  tumTurler: string[]
  raporBasePath: string
  excelBasePath: string
}

function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir) return <span className="ml-1 text-slate-400 text-xs">↕</span>
  return <span className="ml-1 text-teal-700 text-xs">{dir === 'asc' ? '↑' : '↓'}</span>
}

function konumBadge(konum: string) {
  if (konum === 'İç') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">İç</span>
  if (konum === 'Dış') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Dış</span>
  return <span className="text-slate-400 text-xs">—</span>
}

export default function BelirliGundeIzinliPersonelClient({
  tarih,
  satirlar,
  tumMudurlukler,
  tumTurler,
  raporBasePath,
  excelBasePath,
}: Props) {
  const router = useRouter()
  const [konumFiltre, setKonumFiltre] = useState<'' | 'İç' | 'Dış'>('')
  const [mudurlukFiltreler, setMudurlukFiltreler] = useState<string[]>([])
  const [turFiltre, setTurFiltre] = useState('')
  const [sicilFiltre, setSicilFiltre] = useState('')
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
    if (konumFiltre) {
      rows = rows.filter(r => r.konum === konumFiltre)
    }
    if (mudurlukFiltreler.length > 0) {
      const set = new Set(mudurlukFiltreler)
      rows = rows.filter(r => set.has(r.mudurluk))
    }
    if (turFiltre) {
      rows = rows.filter(r => r.tur === turFiltre)
    }
    const trim = sicilFiltre.trim().toLocaleLowerCase('tr-TR')
    if (trim) {
      rows = rows.filter(
        r =>
          r.sicil_no.toLocaleLowerCase('tr-TR').includes(trim) ||
          r.ad_soyad.toLocaleLowerCase('tr-TR').includes(trim),
      )
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      return a[sortKey].localeCompare(b[sortKey], 'tr', { numeric: sortKey === 'sicil_no' }) * dir
    })
  }, [satirlar, konumFiltre, mudurlukFiltreler, turFiltre, sicilFiltre, sortKey, sortDir])

  const handleTarihDegistir = useCallback(
    (yeniTarih: string) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(yeniTarih)) {
        router.push(`${raporBasePath}?tarih=${yeniTarih}`)
      }
    },
    [router, raporBasePath],
  )

  const excelParams = useMemo(() => {
    const p = new URLSearchParams({ tarih })
    if (konumFiltre) p.set('konum', konumFiltre)
    if (mudurlukFiltreler.length) p.set('m', mudurlukFiltreler.join(','))
    if (turFiltre) p.set('t', turFiltre)
    if (sicilFiltre.trim()) p.set('s', sicilFiltre.trim())
    return p.toString()
  }, [tarih, konumFiltre, mudurlukFiltreler, turFiltre, sicilFiltre])

  const thClass = (key: SortKey) =>
    `px-3 py-3 font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-100 transition-colors whitespace-nowrap ${
      sortKey === key ? 'text-teal-800' : ''
    }`

  const formatTarihGoster = (t: string) => {
    const [y, m, d] = t.split('-')
    if (!y || !m || !d) return t
    return `${d}.${m}.${y}`
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/rapor"
            className="intrada-btn intrada-btn-ust-menu mb-2"
          >
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Belirli Günde İzinli Olan Personel Listesi</h1>
          <p className="text-sm text-slate-600 mt-1">
            Seçilen tarihte devam eden aktif izin kayıtları listelenir. Ayrılış tarihi ≤ seçili gün &lt; başlama tarihi.
          </p>
        </div>
        <div className="shrink-0">
          <Link
            href={`${excelBasePath}?${excelParams}`}
            className="intrada-btn intrada-btn-excel gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Excel İndir
          </Link>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-4">
        {/* Tarih */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 whitespace-nowrap font-medium">Tarih</label>
          <input
            type="date"
            value={tarih}
            onChange={e => handleTarihDegistir(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Konum (İç / Dış) */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 whitespace-nowrap">Konum</label>
          <select
            value={konumFiltre}
            onChange={e => setKonumFiltre(e.target.value as '' | 'İç' | 'Dış')}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Tümü</option>
            <option value="İç">İç</option>
            <option value="Dış">Dış</option>
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
                <p className="text-xs text-slate-500">Birden fazla seçilebilir</p>
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

        {/* İzin Türü */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 whitespace-nowrap">İzin Türü</label>
          <select
            value={turFiltre}
            onChange={e => setTurFiltre(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-[200px]"
          >
            <option value="">Tümü</option>
            {tumTurler.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Sicil / Ad */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 whitespace-nowrap">Sicil / Ad</label>
          <input
            type="text"
            value={sicilFiltre}
            onChange={e => setSicilFiltre(e.target.value)}
            placeholder="Ara…"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-40"
          />
        </div>

        <span className="ml-auto text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{gorunenSatirlar.length}</span> personel izinli
        </span>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            {formatTarihGoster(tarih)} tarihinde izinli olan personel
          </span>
          <span className="text-xs text-slate-400">{satirlar.length} toplam kayıt</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-3 py-3 font-semibold text-slate-600 w-12 text-center">No</th>
                <th
                  className={`${thClass('sicil_no')} w-28`}
                  onClick={() => handleSort('sicil_no')}
                >
                  Sicil No <SortIcon dir={sortKey === 'sicil_no' ? sortDir : null} />
                </th>
                <th
                  className={`${thClass('ad_soyad')} min-w-[180px]`}
                  onClick={() => handleSort('ad_soyad')}
                >
                  Adı Soyadı <SortIcon dir={sortKey === 'ad_soyad' ? sortDir : null} />
                </th>
                <th
                  className={`${thClass('statu')} w-28`}
                  onClick={() => handleSort('statu')}
                >
                  Statü <SortIcon dir={sortKey === 'statu' ? sortDir : null} />
                </th>
                <th
                  className={`${thClass('mudurluk')} min-w-[160px]`}
                  onClick={() => handleSort('mudurluk')}
                >
                  Müdürlük <SortIcon dir={sortKey === 'mudurluk' ? sortDir : null} />
                </th>
                <th
                  className={`${thClass('gorevlendirilen_kurum')} min-w-[140px]`}
                  onClick={() => handleSort('gorevlendirilen_kurum')}
                >
                  Görevlendirildiği Kurum <SortIcon dir={sortKey === 'gorevlendirilen_kurum' ? sortDir : null} />
                </th>
                <th
                  className={`${thClass('konum')} w-20 text-center`}
                  onClick={() => handleSort('konum')}
                >
                  Konum <SortIcon dir={sortKey === 'konum' ? sortDir : null} />
                </th>
                <th
                  className={`${thClass('tur')} min-w-[160px]`}
                  onClick={() => handleSort('tur')}
                >
                  İzin Türü <SortIcon dir={sortKey === 'tur' ? sortDir : null} />
                </th>
                <th
                  className={`${thClass('ayrilis')} w-28 text-center`}
                  onClick={() => handleSort('ayrilis')}
                >
                  Ayrılış <SortIcon dir={sortKey === 'ayrilis' ? sortDir : null} />
                </th>
                <th
                  className={`${thClass('baslama')} w-28 text-center`}
                  onClick={() => handleSort('baslama')}
                >
                  Başlama <SortIcon dir={sortKey === 'baslama' ? sortDir : null} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gorunenSatirlar.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    {tarih ? `${formatTarihGoster(tarih)} tarihinde izinli personel bulunamadı.` : 'Tarih seçiniz.'}
                  </td>
                </tr>
              ) : (
                gorunenSatirlar.map((row, i) => (
                  <tr key={`${row.sicil_no}-${i}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 text-center tabular-nums text-slate-500 text-xs">{i + 1}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{row.sicil_no}</td>
                    <td className="px-3 py-2.5 text-slate-800 font-medium">{row.ad_soyad}</td>
                    <td className="px-3 py-2.5 text-slate-600 text-xs">{row.statu || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-700 text-xs">{row.mudurluk || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-700 text-xs">{row.gorevlendirilen_kurum || '—'}</td>
                    <td className="px-3 py-2.5 text-center">{konumBadge(row.konum)}</td>
                    <td className="px-3 py-2.5 text-slate-700">{row.tur}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-slate-600 text-xs">{row.ayrilis}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-slate-600 text-xs">{row.baslama}</td>
                  </tr>
                ))
              )}
            </tbody>
            {gorunenSatirlar.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
                  <td colSpan={10} className="px-3 py-2.5 text-slate-700">
                    Toplam ({gorunenSatirlar.length} kayıt)
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
