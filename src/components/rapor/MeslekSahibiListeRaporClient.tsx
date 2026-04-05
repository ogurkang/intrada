'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import type { MeslekSahibiListeSatir } from '@/lib/rapor-meslek-sahibi-liste'

export interface MeslekSahibiListeTabVerisi {
  periyot: RaporPeriyot
  label: string
  sonGunuEtiket: string
  satirlar: MeslekSahibiListeSatir[]
  gelenler: string[]
  ayrilanlar: string[]
}

interface Props {
  yil: number
  minYil: number
  maxYil: number
  tabs: MeslekSahibiListeTabVerisi[]
  raporBasePath: string
  baslik: string
  aciklama: string
  altNot?: string
}

export default function MeslekSahibiListeRaporClient({
  yil,
  minYil,
  maxYil,
  tabs,
  raporBasePath,
  baslik,
  aciklama,
  altNot,
}: Props) {
  const router = useRouter()
  const [sekmeIndex, setSekmeIndex] = useState(0)
  const [meslekFiltre, setMeslekFiltre] = useState('')
  const aktif = tabs[sekmeIndex]

  const meslekSecenekleri = useMemo(() => {
    if (!aktif?.satirlar.length) return [] as string[]
    const s = new Set<string>()
    for (const r of aktif.satirlar) {
      if (r.meslek_adi.trim()) s.add(r.meslek_adi.trim())
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [aktif?.satirlar])

  const gorunenSatirlar = useMemo(() => {
    if (!aktif) return []
    if (!meslekFiltre.trim()) return aktif.satirlar
    return aktif.satirlar.filter(r => r.meslek_adi.trim() === meslekFiltre.trim())
  }, [aktif, meslekFiltre])

  const yilDegistir = useCallback(
    (y: number) => {
      router.push(`${raporBasePath}?y=${y}`)
    },
    [router, raporBasePath],
  )

  useEffect(() => {
    setMeslekFiltre('')
  }, [sekmeIndex])

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
          <p className="text-sm text-slate-600 mt-1">{aciklama}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 whitespace-nowrap">Meslek</label>
            <select
              value={meslekFiltre}
              onChange={e => setMeslekFiltre(e.target.value)}
              className="min-w-[200px] max-w-[min(100vw-2rem,320px)] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="">Tümü</option>
              {meslekSecenekleri.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
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
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 w-16">Sıra No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 w-28">Sicil No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[180px]">Ad Soyad</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[160px]">Meslek Adı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gorunenSatirlar.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                        {aktif.satirlar.length === 0
                          ? 'Bu dönem ve tarih için meslek bilgisi kayıtlı personel yok.'
                          : 'Seçilen meslek için kayıt yok.'}
                      </td>
                    </tr>
                  ) : (
                    gorunenSatirlar.map((row, i) => (
                      <tr key={`${row.sicil_no}-${row.ad_soyad}-${row.meslek_adi}-${i}`} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{i + 1}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{row.sicil_no}</td>
                        <td className="px-4 py-2.5 text-slate-800">{row.ad_soyad}</td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-normal break-words">{row.meslek_adi}</td>
                      </tr>
                    ))
                  )}
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

          {altNot && <p className="text-xs text-slate-500">{altNot}</p>}
        </>
      )}
    </div>
  )
}
