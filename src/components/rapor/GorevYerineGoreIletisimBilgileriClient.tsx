'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  gorevYerineGoreUnvanSatirClass,
  gorevYerineGoreUnvanVurgu,
} from '@/lib/rapor-gorev-yerine-gore-liste'
import type { GorevYerineGoreIletisimSatir } from '@/lib/rapor-gorev-yerine-gore-iletisim'

const SATIR_RENK_ACIKLAMA =
  'Satır renkleri Görev Yerine Göre Personel Listesi ile aynıdır. Sıralama o listedeki kayıt sırasından gelir.'

interface Props {
  satirlar: GorevYerineGoreIletisimSatir[]
  anlikTarihEtiket: string
  aciklama: string
  excelHref: string
}

export default function GorevYerineGoreIletisimBilgileriClient({
  satirlar,
  anlikTarihEtiket,
  aciklama,
  excelHref,
}: Props) {
  const [filtre, setFiltre] = useState('')
  const [seciliMudurlukler, setSeciliMudurlukler] = useState<string[]>([])

  const mudurlukler = useMemo(() => {
    const s = new Set<string>()
    for (const r of satirlar) {
      if (r.mudurluk.trim() && r.mudurluk !== '—') s.add(r.mudurluk)
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [satirlar])

  const numarali = useMemo(() => {
    const q = filtre.trim().toLocaleLowerCase('tr-TR')
    const mudSet = seciliMudurlukler.length ? new Set(seciliMudurlukler) : null
    const list = satirlar.filter(r => {
      if (mudSet && !mudSet.has(r.mudurluk)) return false
      if (!q) return true
      return (
        r.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) ||
        String(r.sicil_no ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
        r.telefon.toLocaleLowerCase('tr-TR').includes(q) ||
        r.mudurluk.toLocaleLowerCase('tr-TR').includes(q)
      )
    })
    return list.map((r, i) => ({ ...r, siraNo: i + 1 }))
  }, [satirlar, filtre, seciliMudurlukler])

  const excelUrl = useMemo(() => {
    if (!seciliMudurlukler.length) return excelHref
    const m = encodeURIComponent(seciliMudurlukler.join(','))
    return `${excelHref}?m=${m}`
  }, [excelHref, seciliMudurlukler])

  function toggleMudurluk(m: string) {
    setSeciliMudurlukler(prev => (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Görev Yerine Göre İletişim Bilgileri</h1>
          <p className="text-sm text-slate-500 mt-1">{aciklama}</p>
          <p className="text-xs text-slate-400 mt-1">Anlık görüntü: {anlikTarihEtiket}</p>
          <p className="text-xs text-slate-500 mt-2">{SATIR_RENK_ACIKLAMA}</p>
        </div>
        <Link
          href={excelUrl}
          className="shrink-0 bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-800"
        >
          Excel İndir
        </Link>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <input
          type="search"
          value={filtre}
          onChange={e => setFiltre(e.target.value)}
          placeholder="Ad, sicil, telefon veya müdürlük ara…"
          className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-600 mb-1.5">Müdürlük filtresi</p>
          <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
            {mudurlukler.map(m => {
              const on = seciliMudurlukler.includes(m)
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMudurluk(m)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    on
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              )
            })}
            {seciliMudurlukler.length > 0 && (
              <button
                type="button"
                onClick={() => setSeciliMudurlukler([])}
                className="px-2.5 py-1 text-xs rounded-full border border-slate-300 text-slate-500 hover:bg-slate-50"
              >
                Filtreyi temizle
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap w-14">Sıra No</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[160px]">Adı Soyadı</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Konum</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Cinsiyet</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[140px]">Unvanı</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[120px]">Statü</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[160px]">Fiili Görevi</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[120px]">Telefon</th>
            </tr>
          </thead>
          <tbody>
            {numarali.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  Kayıt yok veya filtreye uyan satır yok.
                </td>
              </tr>
            ) : (
              numarali.map(r => (
                <tr
                  key={`${r.kayit_key}-${r.siraNo}`}
                  className={`border-b border-slate-100 ${gorevYerineGoreUnvanSatirClass(gorevYerineGoreUnvanVurgu(r.unvan, r.fiili_gorev))}`}
                >
                  <td className="px-3 py-2.5 tabular-nums text-slate-600">{r.siraNo}</td>
                  <td className="px-3 py-2.5 text-slate-900 font-medium">{r.ad_soyad}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.konum}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.cinsiyet}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.unvan}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.statu}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.fiili_gorev}</td>
                  <td className="px-3 py-2.5 text-slate-800 font-mono text-xs">{r.telefon}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
