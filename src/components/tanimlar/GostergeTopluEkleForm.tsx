'use client'

import { useState, useTransition } from 'react'
import { gostergeTopluEkle } from '@/app/(dashboard)/tanimlar/gosterge/actions'

const DERECE_SEC = Array.from({ length: 15 }, (_, i) => i + 1)
const KADEME_SEC = Array.from({ length: 9 }, (_, i) => i + 1)

type BosSatir = { derece: number; kademe: number; gosterge: string }

function bosSatir(): BosSatir {
  return { derece: 1, kademe: 1, gosterge: '' }
}

interface Props {
  saltOkunur?: boolean
  onBasarili?: () => void
}

export default function GostergeTopluEkleForm({ saltOkunur = false, onBasarili }: Props) {
  const [sunuciHata, setSunuciHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [ekleSatirlar, setEkleSatirlar] = useState<BosSatir[]>([bosSatir()])

  function satirEkle() {
    setEkleSatirlar((s) => [...s, bosSatir()])
  }

  function satirSil(idx: number) {
    setEkleSatirlar((s) => (s.length <= 1 ? s : s.filter((_, i) => i !== idx)))
  }

  function ekleSatirDegistir(idx: number, patch: Partial<BosSatir>) {
    setEkleSatirlar((s) => s.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  function topluKaydet() {
    setSunuciHata(null)
    const satirlar: { derece: number; kademe: number; gosterge: number }[] = []
    for (const r of ekleSatirlar) {
      const g = Number(String(r.gosterge).replace(',', '.'))
      if (r.gosterge === '' || !Number.isFinite(g)) {
        setSunuciHata('Tüm satırlarda gösterge sayısı girilmelidir.')
        return
      }
      satirlar.push({ derece: r.derece, kademe: r.kademe, gosterge: g })
    }
    startTransition(async () => {
      const res = await gostergeTopluEkle(satirlar)
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
              <span className="font-medium">Derece</span>
              <select
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white min-w-[4.5rem]"
                value={satir.derece}
                onChange={(e) => ekleSatirDegistir(idx, { derece: Number(e.target.value) })}
              >
                {DERECE_SEC.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              <span className="font-medium">Kademe</span>
              <select
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white min-w-[4.5rem]"
                value={satir.kademe}
                onChange={(e) => ekleSatirDegistir(idx, { kademe: Number(e.target.value) })}
              >
                {KADEME_SEC.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600 flex-1 min-w-[6rem]">
              <span className="font-medium">Gösterge</span>
              <input
                type="number"
                step="any"
                min={0}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white w-full"
                value={satir.gosterge}
                onChange={(e) => ekleSatirDegistir(idx, { gosterge: e.target.value })}
                placeholder="0"
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
          className="intrada-btn intrada-btn-kaydet disabled:opacity-50"
        >
          {isPending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}
