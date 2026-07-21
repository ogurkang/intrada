'use client'

import { useState, useTransition } from 'react'
import { hareketTopluEkle } from '@/app/(dashboard)/tanimlar/hareket-tanimlari/actions'

const TUR_OPTIONS = [
  { value: 'Geliş', label: 'Geliş' },
  { value: 'Gidiş', label: 'Gidiş' },
] as const

type BosSatir = { tur: string; tip: string }

function bosSatir(): BosSatir {
  return { tur: 'Geliş', tip: '' }
}

interface Props {
  saltOkunur?: boolean
  onBasarili?: () => void
}

export default function HareketTopluEkleForm({ saltOkunur = false, onBasarili }: Props) {
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
    const satirlar: { tur: string; tip: string }[] = []
    for (const r of ekleSatirlar) {
      const tip = r.tip.trim()
      if (!tip) {
        setSunuciHata('Tüm satırlarda tanım metni girilmelidir.')
        return
      }
      satirlar.push({ tur: r.tur, tip })
    }
    startTransition(async () => {
      const res = await hareketTopluEkle(satirlar)
      if (res.hata) setSunuciHata(res.hata)
      else {
        setEkleSatirlar([bosSatir()])
        onBasarili?.()
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
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              <span className="font-medium">Tür</span>
              <select
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white min-w-[7rem]"
                value={satir.tur}
                onChange={e => ekleSatirDegistir(idx, { tur: e.target.value })}
              >
                {TUR_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600 flex-1 min-w-[12rem]">
              <span className="font-medium">Tanım</span>
              <input
                type="text"
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white w-full"
                value={satir.tip}
                onChange={e => ekleSatirDegistir(idx, { tip: e.target.value })}
                placeholder="Geliş veya gidişe göre metin"
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
