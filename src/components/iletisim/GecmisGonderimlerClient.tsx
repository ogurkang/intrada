'use client'

import { useMemo, useState } from 'react'

export interface SmsLogSatir {
  id: number
  alici_ad: string | null
  alici_sicil: string | null
  telefon: string
  mesaj: string
  originator: string | null
  durum: string
  hata_mesaji: string | null
  actor_email: string | null
  created_at: string
}

function tarihFmt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function GecmisGonderimlerClient({ loglar }: { loglar: SmsLogSatir[] }) {
  const [arama, setArama] = useState('')
  const [durum, setDurum] = useState('')

  const filtreli = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')
    return loglar.filter(l => {
      if (durum && l.durum !== durum) return false
      if (q) {
        const hav = `${l.alici_ad ?? ''} ${l.telefon} ${l.mesaj} ${l.actor_email ?? ''}`.toLocaleLowerCase('tr-TR')
        if (!hav.includes(q)) return false
      }
      return true
    })
  }, [loglar, arama, durum])

  const basarili = loglar.filter(l => l.durum === 'gonderildi').length
  const basarisiz = loglar.length - basarili

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={arama}
          onChange={e => setArama(e.target.value)}
          placeholder="Ad, numara, mesaj ara…"
          className="flex-1 min-w-[200px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
        <select
          value={durum}
          onChange={e => setDurum(e.target.value)}
          className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="">Tüm durumlar</option>
          <option value="gonderildi">Gönderildi</option>
          <option value="basarisiz">Başarısız</option>
        </select>
        <div className="text-xs text-slate-500">
          <span className="text-green-700">{basarili} başarılı</span> · <span className="text-red-600">{basarisiz} başarısız</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 sticky top-0">
              <tr>
                <th className="text-left font-medium px-4 py-2">Tarih</th>
                <th className="text-left font-medium px-2 py-2">Alıcı</th>
                <th className="text-left font-medium px-2 py-2">Numara</th>
                <th className="text-left font-medium px-2 py-2">Mesaj</th>
                <th className="text-left font-medium px-2 py-2">Başlık</th>
                <th className="text-left font-medium px-2 py-2">Durum</th>
                <th className="text-left font-medium px-4 py-2">Gönderen</th>
              </tr>
            </thead>
            <tbody>
              {filtreli.map(l => (
                <tr key={l.id} className="border-b border-slate-50">
                  <td className="px-4 py-2 whitespace-nowrap text-slate-500 text-xs">{tarihFmt(l.created_at)}</td>
                  <td className="px-2 py-2 text-slate-700">{l.alici_ad ?? '—'}</td>
                  <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{l.telefon}</td>
                  <td className="px-2 py-2 text-slate-500 max-w-[280px] truncate" title={l.mesaj}>
                    {l.mesaj}
                  </td>
                  <td className="px-2 py-2 text-slate-500 text-xs whitespace-nowrap">{l.originator ?? '—'}</td>
                  <td className="px-2 py-2">
                    {l.durum === 'gonderildi' ? (
                      <span className="text-xs text-green-700 bg-green-50 rounded px-1.5 py-0.5">Gönderildi</span>
                    ) : (
                      <span className="text-xs text-red-600 bg-red-50 rounded px-1.5 py-0.5" title={l.hata_mesaji ?? ''}>
                        Başarısız
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400">{l.actor_email ?? '—'}</td>
                </tr>
              ))}
              {!filtreli.length && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-sm">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
