'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendikaBilgileriTopluEkle } from '@/app/(dashboard)/tanimlar/sendika-bilgileri/actions'

type BosSatir = { statu: string; kisa_ad: string; uzun_ad: string }

const STATU_SECENEKLER = ['Memur', 'İşçi'] as const

function bosSatir(): BosSatir {
  return { statu: 'Memur', kisa_ad: '', uzun_ad: '' }
}

interface Props {
  saltOkunur?: boolean
  onBasarili?: () => void
  /** Kayıt sonrası yönlendirilecek liste sayfası */
  redirectTo?: string
}

export default function SendikaTopluEkleForm({ saltOkunur = false, onBasarili, redirectTo }: Props) {
  const router = useRouter()
  const [sunuciHata, setSunuciHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [ekleSatirlar, setEkleSatirlar] = useState<BosSatir[]>([bosSatir()])

  function satirEkle() {
    setEkleSatirlar(s => [...s, bosSatir()])
  }

  function satirSil(idx: number) {
    setEkleSatirlar(s => (s.length <= 1 ? s : s.filter((_, i) => i !== idx)))
  }

  function ekleSatirDegistir(idx: number, patch: Partial<BosSatir>) {
    setEkleSatirlar(s => s.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  function topluKaydet() {
    setSunuciHata(null)
    const satirlar: { statu: string; kisa_ad: string; uzun_ad: string }[] = []
    for (const r of ekleSatirlar) {
      const statu = r.statu.trim()
      const kisa_ad = r.kisa_ad.trim()
      const uzun_ad = r.uzun_ad.trim()
      if (!kisa_ad || !uzun_ad) {
        setSunuciHata('Tüm satırlarda kısa ad ve uzun ad girilmelidir.')
        return
      }
      satirlar.push({ statu, kisa_ad, uzun_ad })
    }
    startTransition(async () => {
      const res = await sendikaBilgileriTopluEkle(satirlar)
      if (res.hata) setSunuciHata(res.hata)
      else {
        onBasarili?.()
        if (redirectTo) router.push(redirectTo)
        else setEkleSatirlar([bosSatir()])
      }
    })
  }

  return (
    <div>
      {sunuciHata && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{sunuciHata}</div>
      )}
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {ekleSatirlar.map((satir, idx) => (
          <div
            key={idx}
            className="flex flex-wrap items-end gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/60"
          >
            <label className="flex flex-col gap-1 text-xs text-slate-600 w-28">
              <span className="font-medium">Statü</span>
              <select
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white w-full"
                value={satir.statu}
                onChange={e => ekleSatirDegistir(idx, { statu: e.target.value })}
              >
                {STATU_SECENEKLER.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600 flex-1 min-w-[8rem]">
              <span className="font-medium">Kısa Ad</span>
              <input
                type="text"
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white w-full"
                value={satir.kisa_ad}
                onChange={e => ekleSatirDegistir(idx, { kisa_ad: e.target.value })}
                placeholder="Kısa ad"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600 flex-[2] min-w-[12rem]">
              <span className="font-medium">Uzun Ad</span>
              <input
                type="text"
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white w-full"
                value={satir.uzun_ad}
                onChange={e => ekleSatirDegistir(idx, { uzun_ad: e.target.value })}
                placeholder="Uzun ad"
              />
            </label>
            {ekleSatirlar.length > 1 && (
              <button
                type="button"
                onClick={() => satirSil(idx)}
                className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1"
              >
                Satırı kaldır
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 justify-between">
        <button
          type="button"
          onClick={satirEkle}
          className="text-sm text-slate-700 border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50"
        >
          + Satır ekle
        </button>
        <button
          type="button"
          disabled={isPending || saltOkunur}
          onClick={topluKaydet}
          className="text-sm bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50"
        >
          {isPending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}
