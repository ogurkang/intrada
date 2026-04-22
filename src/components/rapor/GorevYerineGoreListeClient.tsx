'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { GorevYerineGoreListeSatir } from '@/lib/rapor-gorev-yerine-gore-liste'

interface Props {
  satirlar: GorevYerineGoreListeSatir[]
  anlikTarihEtiket: string
  aciklama: string
  excelHref?: string
}

export default function GorevYerineGoreListeClient({ satirlar, anlikTarihEtiket, aciklama, excelHref }: Props) {
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
    const list = q
      ? satirlar.filter(
          r =>
            (r.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) ||
              String(r.sicil_no ?? '')
              .toLocaleLowerCase('tr-TR')
              .includes(q)) &&
            (!mudSet || mudSet.has(r.mudurluk)),
        )
      : satirlar.filter(r => !mudSet || mudSet.has(r.mudurluk))
    return list.map((r, i) => ({ ...r, siraNo: i + 1 }))
  }, [satirlar, filtre, seciliMudurlukler])

  const excelMud = seciliMudurlukler.length ? `?m=${encodeURIComponent(seciliMudurlukler.join(','))}` : ''

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <Link
            href="/rapor"
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
          >
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Görev Yerine Göre Personel Listesi</h1>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">{aciklama}</p>
          <p className="text-xs text-slate-500 mt-2">Anlık görüntü: {anlikTarihEtiket}</p>
        </div>
        {excelHref && (
          <Link
            href={`${excelHref}${excelMud}`}
            className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            Excel İndir
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <details className="relative">
          <summary className="list-none cursor-pointer px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700">
            Müdürlük {seciliMudurlukler.length ? `(${seciliMudurlukler.length})` : '(Tümü)'}
          </summary>
          <div className="absolute z-10 mt-1 w-72 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-slate-500">Checkbox ile seçiniz</p>
              <button
                type="button"
                onClick={() => setSeciliMudurlukler([])}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Temizle
              </button>
            </div>
            <div className="space-y-1.5">
              {mudurlukler.map(m => (
                <label key={m} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={seciliMudurlukler.includes(m)}
                    onChange={e =>
                      setSeciliMudurlukler(prev =>
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
        <label className="text-sm text-slate-600">Ara (ad veya sicil)</label>
        <input
          type="search"
          value={filtre}
          onChange={e => setFiltre(e.target.value)}
          placeholder="Filtrele…"
          className="min-w-[220px] max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
        <span className="text-xs text-slate-500">
          {numarali.length} / {satirlar.length} kayıt
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap w-14">Sıra No</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[160px]">
                Adı Soyadı
              </th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Konum</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Cinsiyet</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[140px]">Unvanı</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[120px]">Statü</th>
              <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[160px]">
                Fiili Görevi
              </th>
            </tr>
          </thead>
          <tbody>
            {numarali.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Kayıt yok veya filtreye uyan satır yok.
                </td>
              </tr>
            ) : (
              numarali.map(r => (
                <tr
                  key={`${r.kaynak}-${r.sicil_no ?? '—'}-${r.ad_soyad}-${r.siraNo}`}
                  className="border-b border-slate-100"
                >
                  <td className="px-3 py-2.5 tabular-nums text-slate-600">{r.siraNo}</td>
                  <td className="px-3 py-2.5 text-slate-900 font-medium">{r.ad_soyad}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.konum}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.cinsiyet}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.unvan}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.statu}</td>
                  <td className="px-3 py-2.5 text-slate-800">{r.fiili_gorev}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
