'use client'

import { useEffect, useMemo, useState } from 'react'
import { anketLogEtiket, anketZaman } from '@/lib/anket'
import type { AnketLogSatir } from '@/app/(dashboard)/anket-yonetimi/actions'

function rozet(islem: string): string {
  if (islem === 'sifirlandi' || islem === 'soru_silindi' || islem === 'durduruldu') return 'bg-rose-100 text-rose-700'
  if (islem === 'soru_eklendi' || islem === 'olusturuldu' || islem === 'yayinlandi') return 'bg-emerald-100 text-emerald-700'
  if (islem === 'soru_duzenlendi' || islem === 'baslik_duzenlendi' || islem === 'soru_tasindi') return 'bg-indigo-100 text-indigo-700'
  return 'bg-slate-100 text-slate-700'
}

export default function AnketGecmisPanel({
  acik,
  onKapat,
  loglar,
  baslik,
  yukleniyor = false,
  hata = null,
}: {
  acik: boolean
  onKapat: () => void
  loglar: AnketLogSatir[]
  baslik: string
  yukleniyor?: boolean
  hata?: string | null
}) {
  const [arama, setArama] = useState('')

  useEffect(() => {
    if (!acik) setArama('')
  }, [acik])

  const filtreli = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')
    if (!q) return loglar
    return loglar.filter(log => {
      const metin = `${anketLogEtiket(log.islem)} ${log.ozet} ${log.yapan_ad}`.toLocaleLowerCase('tr-TR')
      return metin.includes(q)
    })
  }, [arama, loglar])

  if (!acik) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Kapat" onClick={onKapat} />
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-xl border border-slate-200 shadow-xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{baslik}</h2>
            <p className="text-xs text-slate-500 mt-1">Tarih, işlem, özet ve işlemi yapan hesap.</p>
          </div>
          <button
            type="button"
            onClick={onKapat}
            className="shrink-0 px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Kapat
          </button>
        </div>
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <input
            type="search"
            value={arama}
            onChange={e => setArama(e.target.value)}
            placeholder="Özet veya kullanıcı ara…"
            className="min-w-[220px] flex-1 max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          <span className="text-xs text-slate-500 ml-auto">{filtreli.length} / {loglar.length} kayıt</span>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Tarih/Saat</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">İşlem</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Özet</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">İşlemi Yapan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {yukleniyor ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">Kayıtlar yükleniyor…</td>
                </tr>
              ) : hata ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-red-700">{hata}</td>
                </tr>
              ) : filtreli.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    {loglar.length === 0 ? 'Henüz değişiklik kaydı yok.' : 'Filtreye uyan kayıt bulunamadı.'}
                  </td>
                </tr>
              ) : filtreli.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{anketZaman(log.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${rozet(log.islem)}`}>
                      {anketLogEtiket(log.islem)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{log.ozet || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{log.yapan_ad || 'Sistem'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
