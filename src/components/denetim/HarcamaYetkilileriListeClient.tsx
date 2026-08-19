'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { HarcamaYetkilisiSatir } from '@/lib/harcama-yetkilileri-liste'

interface Props {
  menuLabel: string
  donemAdi?: string
  satirlar: HarcamaYetkilisiSatir[]
  geriHref?: string
  geriLabel?: string
}

export default function HarcamaYetkilileriListeClient({
  menuLabel,
  donemAdi,
  satirlar,
  geriHref,
  geriLabel,
}: Props) {
  const [filtre, setFiltre] = useState('')

  const gorunen = filtre.trim()
    ? satirlar.filter(r => {
        const q = filtre.trim().toLocaleLowerCase('tr-TR')
        return (
          r.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) ||
          r.kadro_unvani.toLocaleLowerCase('tr-TR').includes(q) ||
          r.sicil_no.includes(q)
        )
      })
    : satirlar

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          {geriHref && geriLabel ? (
            <Link href={geriHref} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
              {geriLabel}
            </Link>
          ) : null}
          <h1 className="text-2xl font-bold text-slate-800">
            {donemAdi ? `${menuLabel} — ${donemAdi}` : menuLabel}
          </h1>
          <p className="mt-1 text-sm text-slate-600">Kadro ünvanında “müdürü” geçen harcama yetkilileri</p>
        </div>
        <span className="shrink-0 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          {satirlar.length} kayıt
        </span>
      </div>

      <div className="relative max-w-xs">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          type="text"
          placeholder="Ad, ünvan veya sicil ara…"
          value={filtre}
          onChange={e => setFiltre(e.target.value)}
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-10 py-3 pl-4 pr-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Kadro Ünvanı</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ad Soyad</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Sicil No</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Telefon</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">E-posta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {gorunen.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">
                  {filtre ? 'Arama sonucu bulunamadı.' : 'Kayıt bulunamadı.'}
                </td>
              </tr>
            ) : (
              gorunen.map((r, i) => (
                <tr key={`${r.sicil_no}-${r.kadro_unvani}`} className="hover:bg-slate-50/60">
                  <td className="py-3 pl-4 pr-2 text-right text-xs text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.kadro_unvani}</td>
                  <td className="px-4 py-3 text-slate-700">{r.ad_soyad}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{r.sicil_no}</td>
                  <td className="px-4 py-3 text-slate-600">{r.telefon}</td>
                  <td className="px-4 py-3 text-slate-600">{r.e_posta}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
