'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { malBildirimDetayHref } from '@/lib/mal-bildirim-route'
import DashboardAnaSayfaLink from '@/components/ui/DashboardAnaSayfaLink'

export interface MalBildirimi {
  id:           number
  public_id?: string | null
  sicil_no:     string
  ad_soyad?:    string | null
  beyan_turu:   string | null
  onay_tarihi:  string | null
  son_net_maas: number | null
  kayit_zamani: string
}

interface Props {
  kayitlar: MalBildirimi[]
  onSil:    (id: number) => Promise<{ hata?: string }>
  kullaniciModu?: boolean
}

export default function MalClient({ kayitlar, onSil, kullaniciModu = false }: Props) {
  const router = useRouter()
  const [arama, setArama] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtreli = useMemo(() => {
    const q = arama.toLowerCase()
    return kayitlar.filter(k =>
      !q ||
      (k.ad_soyad ?? '').toLowerCase().includes(q) ||
      k.sicil_no.toLowerCase().includes(q) ||
      (k.beyan_turu ?? '').toLowerCase().includes(q),
    )
  }, [kayitlar, arama])

  function handleSil(id: number) {
    if (!confirm('Bu mal beyanı kaydı silinecek. Onaylıyor musunuz?')) return
    startTransition(async () => {
      const r = await onSil(id)
      if (r.hata) alert(r.hata)
    })
  }

  function yeniSekmedeAc() {
    window.open('/bildirim/mal/yeni', '_blank', 'noopener,noreferrer')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mal Bildirimi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Taşınmaz, taşıt, banka ve diğer servet beyanları</p>
        </div>
        <div className="flex items-center gap-2">
          {kullaniciModu && <DashboardAnaSayfaLink />}
          <button type="button" onClick={yeniSekmedeAc}
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Beyan
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Ad, sicil veya beyan türü ara…"
          className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Sıra No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-32">Sicil No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-44">Beyan Türü</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Onay Tarihi</th>
              {!kullaniciModu && (
                <th className="text-right px-4 py-3 font-semibold text-slate-600 w-24">İşlem</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtreli.length === 0 && (
              <tr><td colSpan={kullaniciModu ? 5 : 6} className="text-center py-14 text-slate-400">Kayıt bulunamadı.</td></tr>
            )}
            {filtreli.map((kayit, idx) => (
              <tr
                key={kayit.id}
                className="hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => router.push(malBildirimDetayHref(kayit))}
              >
                <td className="px-4 py-3 text-slate-500 tabular-nums">{idx + 1}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{kayit.sicil_no}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{kayit.ad_soyad ?? '—'}</td>
                <td className="px-4 py-3">
                  {kayit.beyan_turu ? (
                    <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">
                      {kayit.beyan_turu}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-center text-xs text-slate-500 tabular-nums">
                  {kayit.onay_tarihi ? new Date(kayit.onay_tarihi).toLocaleDateString('tr-TR') : '—'}
                </td>
                {!kullaniciModu && (
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <button type="button" onClick={() => handleSil(kayit.id)} disabled={isPending}
                    className="text-xs font-medium text-red-500 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40">Sil</button>
                </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
