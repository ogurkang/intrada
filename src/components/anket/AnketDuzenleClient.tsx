'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { anketBaslikGuncelle } from '@/app/(dashboard)/anket-yonetimi/actions'
import { ANKET_KISA_AD_ACIKLAMA } from '@/lib/anket'

const inputSinif =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-800'

export default function AnketDuzenleClient({
  id,
  baslik,
  aciklama,
  kod,
}: {
  id: string
  baslik: string
  aciklama: string
  kod: string
}) {
  const router = useRouter()
  const [ad, setAd] = useState(baslik)
  const [not, setNot] = useState(aciklama)
  const [kisaAd, setKisaAd] = useState(kod)
  const [hata, setHata] = useState<string | null>(null)
  const [kaydediyor, setKaydediyor] = useState(false)

  async function kaydet(e: React.FormEvent) {
    e.preventDefault()
    if (kaydediyor) return
    setHata(null)
    setKaydediyor(true)
    const sonuc = await anketBaslikGuncelle(id, ad, not, kisaAd)
    setKaydediyor(false)
    if (sonuc.hata) {
      setHata(sonuc.hata)
      return
    }
    router.push('/anket-yonetimi/anketler')
    router.refresh()
  }

  return (
    <form onSubmit={kaydet} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Anket adı</span>
        <input value={ad} onChange={e => setAd(e.target.value)} className={`${inputSinif} mt-1`} required />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Açıklama</span>
        <textarea value={not} onChange={e => setNot(e.target.value)} rows={3} className={`${inputSinif} mt-1`} />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Kısa ad</span>
        <input value={kisaAd} onChange={e => setKisaAd(e.target.value)} className={`${inputSinif} mt-1 font-mono`} required />
        <p className="mt-1 text-xs text-slate-500">{ANKET_KISA_AD_ACIKLAMA}</p>
      </label>
      {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <button type="submit" disabled={kaydediyor} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50">
        {kaydediyor ? 'Kaydediliyor…' : 'Kaydet'}
      </button>
    </form>
  )
}
