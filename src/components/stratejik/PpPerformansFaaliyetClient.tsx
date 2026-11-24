'use client'

import { useState, useTransition } from 'react'
import { ppPerformansFaaliyetFormKaydet } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/islemler/[donem_id]/[program_id]/iliski-actions'
import { ppFaaliyetKodu } from '@/lib/pp-iliski'

const input = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'

export type PpPerformansFormBaslangic = {
  faaliyetId?: number
  ad: string
  aciklama: string
  sira: number
  gostergeSayisi?: number
}

export default function PpPerformansFaaliyetClient({
  bagId,
  phKod,
  baslangic,
}: {
  yil: number
  bagId: number
  phKod: string
  baslangic: PpPerformansFormBaslangic
}) {
  const [ad, setAd] = useState(baslangic.ad)
  const [aciklama, setAciklama] = useState(baslangic.aciklama)
  const [hata, setHata] = useState<string | null>(null)
  const [bekliyor, start] = useTransition()
  const fKod = ppFaaliyetKodu(phKod, baslangic.sira)

  function kaydet() {
    if (!ad.trim()) {
      setHata('Performans faaliyeti adı girin.')
      return
    }
    setHata(null)
    start(async () => {
      const sonuc = await ppPerformansFaaliyetFormKaydet({
        id: baslangic.faaliyetId,
        bagId,
        ad,
        aciklama,
        gostergeler: [],
      })
      if (sonuc.hata) {
        setHata(sonuc.hata)
        return
      }
      try {
        window.opener?.location.reload()
      } catch {
        /* ignore */
      }
      try {
        window.close()
      } catch {
        /* ignore */
      }
      if (!window.closed && window.opener == null) {
        if (sonuc.id) {
          window.location.href = `/stratejik-yonetim/performans-programi/pf/${sonuc.id}/gostergeler`
        } else if (baslangic.faaliyetId) {
          window.location.href = `/stratejik-yonetim/performans-programi/pf/${baslangic.faaliyetId}/gostergeler`
        } else {
          window.location.href = `/stratejik-yonetim/performans-programi/hedef/${bagId}`
        }
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end gap-3">
        <p className="pb-2 font-mono text-sm text-slate-700">{fKod}</p>
        <label className="block flex-1 text-sm text-slate-700">
          Performans Faaliyeti
          <input value={ad} onChange={e => setAd(e.target.value)} className={input} />
        </label>
      </div>
      <label className="block text-sm text-slate-700">
        Faaliyet Açıklaması
        <textarea value={aciklama} onChange={e => setAciklama(e.target.value)} className={`${input} min-h-24`} />
      </label>

      {baslangic.faaliyetId ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm text-slate-700">
            Göstergeler ve ödenek teklifleri ayrı ekranda girilir.
            {baslangic.gostergeSayisi != null ? (
              <span className="text-slate-500"> ({baslangic.gostergeSayisi} gösterge)</span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() =>
              window.open(
                `/stratejik-yonetim/performans-programi/pf/${baslangic.faaliyetId}/gostergeler`,
                '_blank',
              )
            }
            className="mt-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
          >
            Göstergeler / Ödenek
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Kaydettikten sonra gösterge ekleyebilir ve her gösterge için ödenek teklifi girebilirsiniz.
        </p>
      )}

      {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={kaydet}
          disabled={bekliyor}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}
