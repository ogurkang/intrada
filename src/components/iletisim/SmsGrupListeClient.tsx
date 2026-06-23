'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { grupOlustur } from '@/app/(dashboard)/iletisim-yonetimi/sms-islemleri/grup/actions'
import type { SmsGrup } from '@/lib/sms-grup'

interface Props {
  gruplar: SmsGrup[]
}

export default function SmsGrupListeClient({ gruplar }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [yeniAd, setYeniAd] = useState('')
  const [mesaj, setMesaj] = useState<string | null>(null)

  function olustur() {
    const ad = yeniAd.trim()
    if (!ad) return
    setMesaj(null)
    startTransition(async () => {
      const res = await grupOlustur(ad)
      if (res.hata) {
        setMesaj(res.hata)
        return
      }
      setYeniAd('')
      if (res.id) router.push(`/iletisim-yonetimi/sms-islemleri/grup/${res.id}`)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Yeni grup oluştur</h3>
        <div className="flex gap-2 max-w-md">
          <input
            value={yeniAd}
            onChange={e => setYeniAd(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && olustur()}
            placeholder="Grup adı…"
            className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <button
            type="button"
            onClick={olustur}
            disabled={isPending || !yeniAd.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50"
          >
            Oluştur
          </button>
        </div>
        {mesaj && <p className="mt-2 text-sm text-red-600">{mesaj}</p>}
        <p className="mt-2 text-xs text-slate-400">Grup oluşturulunca detayına yönlendirilirsiniz; personeli orada eklersiniz.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-sm font-medium text-slate-600">
          Gruplar ({gruplar.length})
        </div>
        {gruplar.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">Henüz grup yok. Yukarıdan yeni grup oluşturun.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {gruplar.map(g => (
              <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="font-medium text-slate-800">{g.ad}</div>
                  <div className="text-xs text-slate-400">{g.uyeler.length} üye</div>
                </div>
                <Link
                  href={`/iletisim-yonetimi/sms-islemleri/grup/${g.id}`}
                  className="px-3 py-1.5 text-sm font-medium text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-50"
                >
                  Detay
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
