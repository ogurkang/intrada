'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import { personelDetayHref } from '@/lib/personel-link'
import { trNormalize } from '@/lib/turkce-search'

type Satir = Pick<Tables<'calisan'>, 'sicil_no' | 'public_id' | 'ad_soyad' | 'tckn' | 'dogum_tarihi'>

interface Props {
  data: Satir[]
}

type SortSutun = 'sicil_no' | 'ad_soyad' | 'tckn' | 'dogum_tarihi'
type SortYon = 'asc' | 'desc'

const SAYFA_BOYUTU = 10

function tarihFormatla(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

function tarihSiralaDegeri(t: string | null): number {
  if (!t) return Number.NaN
  const ts = Date.parse(t)
  return Number.isFinite(ts) ? ts : Number.NaN
}

/** Rakam ve metin parçalarına bölerek doğal sıralama yapar (1 < 2 < 10 < 20). */
function naturalCompare(a: string, b: string): number {
  const re = /(\d+)|(\D+)/g
  const ap = a.match(re) ?? []
  const bp = b.match(re) ?? []
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    const x = ap[i] ?? ''
    const y = bp[i] ?? ''
    if (x === y) continue
    const nx = parseInt(x, 10)
    const ny = parseInt(y, 10)
    if (!isNaN(nx) && !isNaN(ny)) return nx - ny
    return x.localeCompare(y, 'tr')
  }
  return 0
}

function personelSirala(liste: Satir[], sutun: SortSutun, yon: SortYon): Satir[] {
  return [...liste].sort((a, b) => {
    let fark = 0
    if (sutun === 'dogum_tarihi') {
      const ta = tarihSiralaDegeri(a.dogum_tarihi)
      const tb = tarihSiralaDegeri(b.dogum_tarihi)
      const aGecerli = Number.isFinite(ta)
      const bGecerli = Number.isFinite(tb)
      if (aGecerli && bGecerli) fark = ta - tb
      else if (aGecerli !== bGecerli) fark = aGecerli ? -1 : 1
    } else {
      fark = naturalCompare(String(a[sutun] ?? ''), String(b[sutun] ?? ''))
    }
    return yon === 'asc' ? fark : -fark
  })
}

function SortIkon({ aktif, yon }: { aktif: boolean; yon: SortYon }) {
  if (!aktif) {
    return (
      <span className="ml-1 text-slate-300">
        <svg className="inline w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      </span>
    )
  }
  return yon === 'asc' ? <span className="ml-1 text-blue-500">↑</span> : <span className="ml-1 text-blue-500">↓</span>
}

export default function PersonelListClient({ data }: Props) {
  const router = useRouter()
  const [arama, setArama] = useState('')
  const [sayfa, setSayfa] = useState(0)
  const [sortSutun, setSortSutun] = useState<SortSutun>('sicil_no')
  const [sortYon, setSortYon] = useState<SortYon>('asc')

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === 'refresh') window.location.reload()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const filtreli = useMemo(() => {
    const q = trNormalize(arama)
    if (!q) return data
    return data.filter(p =>
      trNormalize(p.sicil_no).includes(q) ||
      trNormalize(p.ad_soyad).includes(q) ||
      p.tckn?.includes(q)
    )
  }, [data, arama])

  const siraliFiltreli = useMemo(
    () => personelSirala(filtreli, sortSutun, sortYon),
    [filtreli, sortSutun, sortYon],
  )

  useEffect(() => setSayfa(0), [arama, sortSutun, sortYon])

  const toplamSayfa = Math.max(1, Math.ceil(siraliFiltreli.length / SAYFA_BOYUTU))
  const sayfadaki = siraliFiltreli.slice(sayfa * SAYFA_BOYUTU, (sayfa + 1) * SAYFA_BOYUTU)

  function handleSutunTikla(sutun: SortSutun) {
    if (sortSutun === sutun) {
      setSortYon(y => (y === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortSutun(sutun)
      setSortYon('asc')
    }
  }

  function ThSutun({ sutun, label, className }: { sutun: SortSutun; label: string; className?: string }) {
    const aktif = sortSutun === sutun
    return (
      <th
        className={`px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:bg-slate-100 transition-colors text-left ${
          aktif ? 'text-blue-600 bg-blue-50' : ''
        } ${className ?? ''}`}
        onClick={() => handleSutunTikla(sutun)}
      >
        {label}
        <SortIkon aktif={aktif} yon={sortYon} />
      </th>
    )
  }

  return (
    <div>
      {/* Başlık + araç çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">Çalışanlar</h1>
          <p className="text-sm text-slate-500 mt-0.5">{data.length} kayıt</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Ad, sicil no veya TCKN ara…"
              value={arama}
              onChange={e => setArama(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-slate-500 w-60"
            />
          </div>
          <Link
            href="/personel/yeni"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2
                       rounded-lg hover:bg-slate-700 transition-colors font-medium whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Personel
          </Link>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-14">Sıra No</th>
                <ThSutun sutun="sicil_no" label="Sicil No" className="w-28" />
                <ThSutun sutun="ad_soyad" label="Adı Soyadı" />
                <ThSutun sutun="tckn" label="TCKN" className="w-36" />
                <ThSutun sutun="dogum_tarihi" label="Doğum Tarihi" className="w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {siraliFiltreli.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400">
                    {arama ? `"${arama}" için sonuç bulunamadı.` : 'Henüz personel kaydı yok.'}
                  </td>
                </tr>
              )}
              {sayfadaki.map((p, i) => (
                <tr
                  key={p.sicil_no}
                  onClick={() => router.push(personelDetayHref(p))}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-center text-xs text-slate-400">{sayfa * SAYFA_BOYUTU + i + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sicil_no}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.ad_soyad}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.tckn ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{tarihFormatla(p.dogum_tarihi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {siraliFiltreli.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {arama
                ? `${siraliFiltreli.length} / ${data.length} kayıt · Sayfa ${sayfa + 1}/${toplamSayfa}`
                : `Toplam ${data.length} kayıt · Sayfa ${sayfa + 1}/${toplamSayfa}`}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setSayfa(0)} disabled={sayfa === 0}
                className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40">İlk</button>
              <button onClick={() => setSayfa(p => Math.max(0, p - 1))} disabled={sayfa === 0}
                className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40">Önceki</button>
              {Array.from({ length: Math.min(toplamSayfa, 5) }, (_, i) => {
                const start = Math.max(0, Math.min(sayfa - 2, toplamSayfa - 5))
                const p = start + i
                return (
                  <button key={p} onClick={() => setSayfa(p)}
                    className={`w-8 h-7 text-xs rounded border ${p === sayfa ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 hover:bg-slate-50'}`}>
                    {p + 1}
                  </button>
                )
              })}
              {toplamSayfa > 5 && <span className="text-xs text-slate-400">…{toplamSayfa}</span>}
              <button onClick={() => setSayfa(p => Math.min(toplamSayfa - 1, p + 1))} disabled={sayfa >= toplamSayfa - 1}
                className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40">Sonraki</button>
              <button onClick={() => setSayfa(toplamSayfa - 1)} disabled={sayfa >= toplamSayfa - 1}
                className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40">Son</button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-sm text-slate-500">
        Görev bilgileri personel kartında <strong className="text-slate-700">Kişisel Bilgiler</strong> sekmesinde; düzenleme için karttaki{' '}
        <strong className="text-slate-700">Değiştir</strong> ile açılan formu kullanın.
      </p>
    </div>
  )
}
