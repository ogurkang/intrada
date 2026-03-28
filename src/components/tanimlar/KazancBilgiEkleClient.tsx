'use client'

import { useState, useTransition } from 'react'
import type { KazancTopluSatir } from '@/app/(dashboard)/tanimlar/kazanc-bilgi/actions'
import { kazancBilgiTopluEkle } from '@/app/(dashboard)/tanimlar/kazanc-bilgi/actions'
import { broadcastIntradaRefresh } from '@/lib/intrada-tab-sync'

const DERECE_SEC = Array.from({ length: 15 }, (_, i) => i + 1)

const selDar = 'mt-0.5 w-full min-w-0 border border-slate-300 rounded-md px-1 py-1 text-xs bg-white'
const inpDar = 'mt-0.5 w-full min-w-0 border border-slate-300 rounded-md px-1 py-1 text-xs tabular-nums'

function bosSatir(unvanlar: { id: number }[], ogrenimler: { id: number }[]): KazancTopluSatir {
  return {
    sira_no: null,
    unvan_id: unvanlar[0]?.id ?? 0,
    ogrenim_id: ogrenimler[0]?.id ?? 0,
    derece: 1,
    ek_gosterge: null,
    ek_odeme: null,
    oht: null,
    yan_odeme: null,
    sds_orani: null,
  }
}

interface Props {
  unvanlar: { id: number; unvan_adi: string }[]
  ogrenimler: { id: number; isim: string }[]
  saltOkunur?: boolean
}

export default function KazancBilgiEkleClient({ unvanlar, ogrenimler, saltOkunur = false }: Props) {
  const [satirlar, setSatirlar] = useState<KazancTopluSatir[]>(() =>
    unvanlar.length && ogrenimler.length ? [bosSatir(unvanlar, ogrenimler)] : []
  )
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function satirEkle() {
    setSatirlar((s) => [...s, bosSatir(unvanlar, ogrenimler)])
  }

  function satirSil(idx: number) {
    setSatirlar((s) => (s.length <= 1 ? s : s.filter((_, i) => i !== idx)))
  }

  function satirDegistir(idx: number, patch: Partial<KazancTopluSatir>) {
    setSatirlar((s) => s.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  function kaydet() {
    setHata(null)
    const temiz: KazancTopluSatir[] = []
    for (const r of satirlar) {
      if (!r.unvan_id || !r.ogrenim_id) {
        setHata('Her satırda unvan ve öğrenim seçilmelidir.')
        return
      }
      temiz.push({ ...r, sira_no: null })
    }
    if (!temiz.length) {
      setHata('En az bir satır ekleyin.')
      return
    }
    startTransition(async () => {
      const res = await kazancBilgiTopluEkle(temiz)
      if (res.hata) setHata(res.hata)
      else {
        broadcastIntradaRefresh('kazanc')
        if (typeof window !== 'undefined' && window.opener) {
          try {
            window.opener.postMessage({ source: 'intrada-kazanc-ekle', type: 'refresh' }, window.location.origin)
          } catch {
            window.opener.postMessage({ source: 'intrada-kazanc-ekle', type: 'refresh' }, '*')
          }
        }
        setSatirlar([bosSatir(unvanlar, ogrenimler)])
        if (typeof window !== 'undefined') window.close()
      }
    })
  }

  if (!ogrenimler.length) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-4">
        Öğrenim tanımı yok. Önce Tanımlar üzerinden en az bir öğrenim türü ekleyin.
      </p>
    )
  }

  if (!unvanlar.length) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-4">
        Kadro hareketlerinde asil veya vekil ile eşleşmiş en az bir ünvan yok. Ünvan metinleri Tanımlar’daki ünvan adlarıyla
        birebir aynı olmalıdır.
      </p>
    )
  }

  return (
    <div>
      {hata && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{hata}</div>}

      <div className="flex items-center justify-between mb-4 gap-4">
        <p className="text-sm text-slate-600 flex-1 min-w-0">
          Sıra numarası kayıtta otomatik verilir. Tek veya birden çok satır ekleyip kaydedin; kayıt sonrası pencere kapanır.
        </p>
        {!saltOkunur && (
          <button
            type="button"
            onClick={satirEkle}
            className="shrink-0 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50"
          >
            + Satır ekle
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
        {satirlar.map((r, idx) => (
          <div
            key={idx}
            className="flex w-full flex-nowrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-2 min-w-0"
          >
            <label className="flex min-w-0 flex-[2] flex-col">
              <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">Unvan</span>
              <select
                className={selDar}
                value={r.unvan_id}
                onChange={(e) => satirDegistir(idx, { unvan_id: Number(e.target.value) })}
              >
                {unvanlar.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unvan_adi}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-[2] flex-col">
              <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">Öğrenim</span>
              <select
                className={selDar}
                value={r.ogrenim_id}
                onChange={(e) => satirDegistir(idx, { ogrenim_id: Number(e.target.value) })}
              >
                {ogrenimler.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.isim}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex w-12 shrink-0 flex-col">
              <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">D.</span>
              <select
                className={selDar}
                value={r.derece}
                onChange={(e) => satirDegistir(idx, { derece: Number(e.target.value) })}
              >
                {DERECE_SEC.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            {(
              [
                ['ek_gosterge', 'Ek G.'],
                ['ek_odeme', 'Ek Ö.'],
                ['oht', 'ÖHT'],
                ['yan_odeme', 'Yan Ö.'],
                ['sds_orani', 'SDS'],
              ] as const
            ).map(([key, short]) => (
              <label key={key} className="flex min-w-0 flex-1 flex-col">
                <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">{short}</span>
                <input
                  className={inpDar}
                  value={(r[key] as string | null) ?? ''}
                  onChange={(e) => satirDegistir(idx, { [key]: e.target.value.trim() || null })}
                />
              </label>
            ))}
            <div className="shrink-0 flex items-end pb-0.5 pl-1">
              <button
                type="button"
                onClick={() => satirSil(idx)}
                className="text-xs text-red-600 hover:text-red-800 whitespace-nowrap disabled:opacity-40"
                disabled={satirlar.length <= 1}
                title="Satırı sil"
              >
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>

      {!saltOkunur && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            disabled={isPending}
            onClick={kaydet}
            className="px-5 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      )}
    </div>
  )
}
