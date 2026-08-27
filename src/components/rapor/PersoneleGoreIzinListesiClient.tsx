'use client'

import Link from 'next/link'
import { Fragment, useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { gruplaPersoneleGoreIzinListesi } from '@/lib/rapor-personele-gore-izin-listesi'

interface PersoneleGoreIzinSatir {
  sicil_no: string
  ad_soyad: string
  mudurluk: string
  ayrilis: string
  baslama: string
  tur: string
  durum: string
  gun: number
  mudur: boolean
  unvan: string
}

type SortKey = 'sicil_no' | 'ad_soyad' | 'mudurluk' | 'ayrilis' | 'baslama' | 'tur' | 'durum' | 'gun'
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
  const [durumFiltre, setDurumFiltre] = useState('taslak-haric')
  const [personelFiltre, setPersonelFiltre] = useState('')
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

  const tumDurumlar = useMemo(
    () =>
      [...new Set(satirlar.map(r => r.durum).filter(d => d && d !== '—'))].sort((a, b) =>
        a.localeCompare(b, 'tr'),
      ),
    [satirlar],
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
    if (durumFiltre === 'taslak-haric') {
      rows = rows.filter(r => r.durum !== 'Taslak')
    } else if (durumFiltre) {
      rows = rows.filter(r => r.durum === durumFiltre)
    }
    if (personelFiltre === 'mudurler') {
      rows = rows.filter(r => r.mudur)
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sortKey === 'gun') return (a.gun - b.gun) * dir
      return a[sortKey].localeCompare(b[sortKey], 'tr', { numeric: sortKey === 'sicil_no' }) * dir
    })
  }, [satirlar, mudurlukFiltreler, sicilFiltre, turFiltre, durumFiltre, personelFiltre, sortKey, sortDir])

  const gruplar = useMemo(() => gruplaPersoneleGoreIzinListesi(gorunenSatirlar), [gorunenSatirlar])

  const yilDegistir = useCallback(
    (y: number) => router.push(`${raporBasePath}?y=${y}`),
    [router, raporBasePath],
  )

  const excelParams = useMemo(() => {
    const p = new URLSearchParams({ y: String(yil) })
    if (mudurlukFiltreler.length) p.set('m', mudurlukFiltreler.join(','))
    if (sicilFiltre.trim()) p.set('s', sicilFiltre.trim())
    if (turFiltre) p.set('t', turFiltre)
    p.set('d', durumFiltre || 'tumu')
    if (personelFiltre) p.set('pe', personelFiltre)
    return p.toString()
  }, [yil, mudurlukFiltreler, sicilFiltre, turFiltre, durumFiltre, personelFiltre])

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
            Seçili yılda kullanılan izinler; müdürlük, sicil, tür, durum ve personele göre filtrelenebilir.
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

        {/* Personel */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 whitespace-nowrap">Personel</label>
          <select
            value={personelFiltre}
            onChange={e => setPersonelFiltre(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="">Tümü</option>
            <option value="mudurler">Müdürler</option>
          </select>
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

        {/* Durum */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 whitespace-nowrap">Durum</label>
          <select
            value={durumFiltre}
            onChange={e => setDurumFiltre(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 max-w-[200px]"
          >
            <option value="taslak-haric">Taslak hariç</option>
            <option value="">Tümü</option>
            {tumDurumlar.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Sonuç sayısı */}
        <span className="ml-auto text-sm text-slate-500">
          {gruplar.length} personel · {gorunenSatirlar.length} kayıt
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[1080px]">
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
                  className={`text-left ${thClass('ad_soyad')} min-w-[180px]`}
                  onClick={() => handleSort('ad_soyad')}
                >
                  Adı Soyadı
                  <SortIcon dir={sortKey === 'ad_soyad' ? sortDir : null} />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[180px]">Unvan</th>
                <th
                  className={`text-left ${thClass('ayrilis')} w-28`}
                  onClick={() => handleSort('ayrilis')}
                >
                  Ayrılış
                  <SortIcon dir={sortKey === 'ayrilis' ? sortDir : null} />
                </th>
                <th
                  className={`text-left ${thClass('baslama')} w-28`}
                  onClick={() => handleSort('baslama')}
                >
                  Başlama
                  <SortIcon dir={sortKey === 'baslama' ? sortDir : null} />
                </th>
                <th
                  className={`text-left ${thClass('tur')} min-w-[140px]`}
                  onClick={() => handleSort('tur')}
                >
                  İzin Türü
                  <SortIcon dir={sortKey === 'tur' ? sortDir : null} />
                </th>
                <th
                  className={`text-left ${thClass('durum')} w-32`}
                  onClick={() => handleSort('durum')}
                >
                  Durum
                  <SortIcon dir={sortKey === 'durum' ? sortDir : null} />
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
            <tbody>
              {gruplar.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                gruplar.map(grup => (
                  <Fragment key={grup.sicil_no}>
                    <tr className="bg-teal-50 border-t-2 border-teal-200">
                      <td className="px-3 py-2.5 text-center tabular-nums font-semibold text-teal-900">
                        {grup.sira}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-teal-900">
                        {grup.sicil_no}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-teal-950">{grup.ad_soyad}</td>
                      <td className="px-4 py-2.5 text-teal-900 text-xs">{grup.mudur ? grup.unvan || '—' : ''}</td>
                      <td colSpan={5} className="px-4 py-2.5 text-xs text-teal-800">
                        Ayrılış / Başlama
                      </td>
                    </tr>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <td colSpan={4} className="px-4 py-1.5 text-xs text-slate-500">
                        {grup.mudurluk || '—'}
                      </td>
                      <td className="px-4 py-1.5 text-xs font-medium text-slate-600">Ayrılış</td>
                      <td className="px-4 py-1.5 text-xs font-medium text-slate-600">Başlama</td>
                      <td className="px-4 py-1.5 text-xs font-medium text-slate-600">İzin Türü</td>
                      <td className="px-4 py-1.5 text-xs font-medium text-slate-600">Durum</td>
                      <td className="px-4 py-1.5 text-right text-xs font-semibold text-slate-800">
                        İzin toplamı: {grup.toplamGun}
                      </td>
                    </tr>
                    {grup.kayitlar.map((row, i) => (
                      <tr
                        key={`${row.sicil_no}-${row.ayrilis}-${row.baslama}-${row.durum}-${i}`}
                        className="hover:bg-slate-50 transition-colors border-b border-slate-100"
                      >
                        <td className="px-3 py-2 text-center text-slate-300">·</td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2 text-slate-700 text-xs tabular-nums">{row.ayrilis}</td>
                        <td className="px-4 py-2 text-slate-700 text-xs tabular-nums">{row.baslama}</td>
                        <td className="px-4 py-2 text-slate-700">{row.tur}</td>
                        <td className="px-4 py-2 text-slate-700">{row.durum}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold text-slate-800">
                          {row.gun}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
            {gruplar.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200 font-semibold">
                  <td colSpan={8} className="px-4 py-2.5 text-slate-700">
                    Genel toplam ({gruplar.length} personel, {gorunenSatirlar.length} kayıt)
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
