'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

const BIRIMLER = ['Yüzde', 'Adet', 'Kişi', 'Gün', 'Hektar', 'Ton', 'Metre', 'Metrekare', 'Saat'] as const

interface Props {
  donemId: number
  altHedefId: number
  yillar: number[]
  onEkle: (altHedefId: number, donemId: number, fd: FormData) => Promise<{ hata?: string }>
  onTopluEkle: (
    altHedefId: number,
    donemId: number,
    satirlar: {
      sira_no: number | null
      gosterge_adi: string
      birim: string
      yil_1: number | null
      yil_2: number | null
      yil_3: number | null
      yil_4: number | null
      yil_5: number | null
    }[],
  ) => Promise<{ hata?: string; kaydedilen?: number }>
}

interface RowState {
  id: string
  sira_no: string
  gosterge_adi: string
  birim: string
  yil_1: string
  yil_2: string
  yil_3: string
  yil_4: string
  yil_5: string
}

function bosSatir(): RowState {
  return {
    id: `${Date.now()}-${Math.random()}`,
    sira_no: '',
    gosterge_adi: '',
    birim: '',
    yil_1: '',
    yil_2: '',
    yil_3: '',
    yil_4: '',
    yil_5: '',
  }
}

function toNum(v: string): number | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export default function StratejikPlanGostergeYeniClient({ donemId, altHedefId, yillar, onEkle, onTopluEkle }: Props) {
  const router = useRouter()
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [satirlar, setSatirlar] = useState<RowState[]>([bosSatir()])

  function tamamlaVeKapat() {
    if (typeof window !== 'undefined' && window.opener) {
      try {
        window.opener.postMessage({ source: 'intrada-stratejik-gosterge', type: 'refresh' }, window.location.origin)
      } catch {
        window.opener.postMessage({ source: 'intrada-stratejik-gosterge', type: 'refresh' }, '*')
      }
      window.close()
      return
    }
    router.back()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    startTransition(async () => {
      const dolu = satirlar
        .map(s => ({
          sira_no: s.sira_no.trim() ? Number.parseInt(s.sira_no, 10) : null,
          gosterge_adi: s.gosterge_adi.trim(),
          birim: s.birim.trim(),
          yil_1: toNum(s.yil_1),
          yil_2: toNum(s.yil_2),
          yil_3: toNum(s.yil_3),
          yil_4: toNum(s.yil_4),
          yil_5: toNum(s.yil_5),
        }))
        .filter(s => s.gosterge_adi || s.birim || s.yil_1 != null || s.yil_2 != null || s.yil_3 != null || s.yil_4 != null || s.yil_5 != null)
      if (!dolu.length) {
        setHata('En az bir gösterge satırı doldurmalısınız.')
        return
      }
      const eksik = dolu.some(s => !s.gosterge_adi || !s.birim)
      if (eksik) {
        setHata('Dolu satırlarda Gösterge İsmi ve Birim zorunludur.')
        return
      }
      const res = dolu.length === 1
        ? await (() => {
            const fd = new FormData()
            const r = dolu[0]
            if (r.sira_no != null) fd.set('sira_no', String(r.sira_no))
            fd.set('gosterge_adi', r.gosterge_adi)
            fd.set('birim', r.birim)
            if (r.yil_1 != null) fd.set('yil_1', String(r.yil_1))
            if (r.yil_2 != null) fd.set('yil_2', String(r.yil_2))
            if (r.yil_3 != null) fd.set('yil_3', String(r.yil_3))
            if (r.yil_4 != null) fd.set('yil_4', String(r.yil_4))
            if (r.yil_5 != null) fd.set('yil_5', String(r.yil_5))
            return onEkle(altHedefId, donemId, fd)
          })()
        : await onTopluEkle(altHedefId, donemId, dolu)
      if (res.hata) setHata(res.hata)
      else tamamlaVeKapat()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-2 py-2 text-left w-20">Sıra No</th>
                <th className="px-2 py-2 text-left">Gösterge İsmi *</th>
                <th className="px-2 py-2 text-left w-28">Birim *</th>
                {yillar.map(y => (
                  <th key={y} className="px-2 py-2 text-center w-20">{y}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {satirlar.map((s) => (
                <tr key={s.id} className="bg-white">
                  <td className="px-2 py-2 align-top">
                    <input value={s.sira_no} onChange={e => setSatirlar(prev => prev.map(r => r.id === s.id ? { ...r, sira_no: e.target.value } : r))} type="number" min={1} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs" />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input value={s.gosterge_adi} onChange={e => setSatirlar(prev => prev.map(r => r.id === s.id ? { ...r, gosterge_adi: e.target.value } : r))} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs" />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <select value={s.birim} onChange={e => setSatirlar(prev => prev.map(r => r.id === s.id ? { ...r, birim: e.target.value } : r))} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white">
                      <option value="">Seçiniz</option>
                      {BIRIMLER.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input value={s.yil_1} onChange={e => setSatirlar(prev => prev.map(r => r.id === s.id ? { ...r, yil_1: e.target.value } : r))} type="number" step="0.01" className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs" />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input value={s.yil_2} onChange={e => setSatirlar(prev => prev.map(r => r.id === s.id ? { ...r, yil_2: e.target.value } : r))} type="number" step="0.01" className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs" />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input value={s.yil_3} onChange={e => setSatirlar(prev => prev.map(r => r.id === s.id ? { ...r, yil_3: e.target.value } : r))} type="number" step="0.01" className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs" />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input value={s.yil_4} onChange={e => setSatirlar(prev => prev.map(r => r.id === s.id ? { ...r, yil_4: e.target.value } : r))} type="number" step="0.01" className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs" />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input value={s.yil_5} onChange={e => setSatirlar(prev => prev.map(r => r.id === s.id ? { ...r, yil_5: e.target.value } : r))} type="number" step="0.01" className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}

        <div className="flex items-center justify-between gap-3 pt-1">
          <button type="button" onClick={() => setSatirlar(prev => [...prev, bosSatir()])} className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-50">
            Satır Ekle
          </button>
          <div className="flex items-center gap-3">
          <button type="button" onClick={tamamlaVeKapat} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">
            Kapat
          </button>
          <button type="submit" disabled={isPending} className="px-4 py-2 text-sm text-white bg-slate-800 rounded-lg disabled:opacity-50">
            {isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          </div>
        </div>
      </form>
    </div>
  )
}

