'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export interface PpButceDetaySatir {
  butce_kodu_id: number
  adim_1: string
  adim_2: string
  adim_3: string
  adim_4: string
  ekonomik_kod: string
  hesap_adi: string
  cari_yil_butce: number | null
  cari_yil_haziran_sonu: number | null
  cari_yil_yil_sonu_tahmin: number | null
  sonraki_yil_butce_1: number | null
  sonraki_yil_butce_2: number | null
  sonraki_yil_butce_3: number | null
}

interface Props {
  yil: number
  faaliyetId: number
  satirlar: PpButceDetaySatir[]
  onKaydet: (
    faaliyetId: number,
    yil: number,
    kalemler: {
      butce_kodu_id: number
      cari_yil_butce: number | null
      cari_yil_haziran_sonu: number | null
      cari_yil_yil_sonu_tahmin: number | null
      sonraki_yil_butce_1: number | null
      sonraki_yil_butce_2: number | null
      sonraki_yil_butce_3: number | null
    }[],
  ) => Promise<{ hata?: string; kaydedilen?: number }>
}

function fmt(v: number | null): string {
  if (v == null || Number.isNaN(v)) return ''
  return Number(v).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parse(v: string): number | null {
  const s = String(v ?? '').trim().replace(/[.]/g, '').replace(',', '.')
  if (!s) return null
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : null
}

export default function PerformansProgramiVeriGirisButceClient({ yil, faaliyetId, satirlar, onKaydet }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [degerler, setDegerler] = useState<Record<number, { b: string; h: string; y: string; n1: string; n2: string; n3: string }>>(() => {
    const m: Record<number, { b: string; h: string; y: string; n1: string; n2: string; n3: string }> = {}
    for (const s of satirlar) {
      m[s.butce_kodu_id] = {
        b: fmt(s.cari_yil_butce),
        h: fmt(s.cari_yil_haziran_sonu),
        y: fmt(s.cari_yil_yil_sonu_tahmin),
        n1: fmt(s.sonraki_yil_butce_1),
        n2: fmt(s.sonraki_yil_butce_2),
        n3: fmt(s.sonraki_yil_butce_3),
      }
    }
    return m
  })

  function kaydetVeKapat() {
    setHata(null)
    const payload = satirlar.map(s => {
      const v = degerler[s.butce_kodu_id] ?? { b: '', h: '', y: '', n1: '', n2: '', n3: '' }
      return {
        butce_kodu_id: s.butce_kodu_id,
        cari_yil_butce: parse(v.b),
        cari_yil_haziran_sonu: parse(v.h),
        cari_yil_yil_sonu_tahmin: parse(v.y),
        sonraki_yil_butce_1: parse(v.n1),
        sonraki_yil_butce_2: parse(v.n2),
        sonraki_yil_butce_3: parse(v.n3),
      }
    })
    startTransition(async () => {
      const res = await onKaydet(faaliyetId, yil, payload)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      router.push(`/stratejik-yonetim/performans-programi/islemler/${yil}/veri-giris`)
    })
  }

  return (
    <div className="space-y-4">
      {hata && <div className="px-3 py-2 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700">{hata}</div>}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-auto max-h-[68vh]">
          <table className="w-full text-sm min-w-[1400px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-center w-16">A1</th>
                <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-center w-16">A2</th>
                <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-center w-16">A3</th>
                <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-center w-16">A4</th>
                <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-left w-36">Ekonomik Kod</th>
                <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-left">Hesap Adı</th>
                <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-right w-40">{yil - 1} Bütçe</th>
                <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-right w-44">{yil - 1} Haziran Sonu Gerçekleşme</th>
                <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-right w-44">{yil - 1} Yıl Sonu Tahmin</th>
                <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-right w-36">{yil} Bütçe</th>
                <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-right w-36">{yil + 1} Bütçe</th>
                <th className="sticky top-0 z-10 bg-slate-100 px-3 py-2 text-right w-36">{yil + 2} Bütçe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {satirlar.map(s => {
                const v = degerler[s.butce_kodu_id] ?? { b: '', h: '', y: '', n1: '', n2: '', n3: '' }
                return (
                  <tr key={s.butce_kodu_id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-center font-mono text-xs">{s.adim_1}</td>
                    <td className="px-3 py-2 text-center font-mono text-xs">{s.adim_2}</td>
                    <td className="px-3 py-2 text-center font-mono text-xs">{s.adim_3}</td>
                    <td className="px-3 py-2 text-center font-mono text-xs">{s.adim_4}</td>
                    <td className="px-3 py-2 font-mono text-xs">{s.ekonomik_kod}</td>
                    <td className="px-3 py-2">{s.hesap_adi}</td>
                    <td className="px-3 py-2"><input value={v.b} onChange={e => setDegerler(prev => ({ ...prev, [s.butce_kodu_id]: { ...v, b: e.target.value } }))} className="w-full px-2 py-1 border border-slate-300 rounded text-right text-sm" placeholder="12.345,67" /></td>
                    <td className="px-3 py-2"><input value={v.h} onChange={e => setDegerler(prev => ({ ...prev, [s.butce_kodu_id]: { ...v, h: e.target.value } }))} className="w-full px-2 py-1 border border-slate-300 rounded text-right text-sm" placeholder="12.345,67" /></td>
                    <td className="px-3 py-2"><input value={v.y} onChange={e => setDegerler(prev => ({ ...prev, [s.butce_kodu_id]: { ...v, y: e.target.value } }))} className="w-full px-2 py-1 border border-slate-300 rounded text-right text-sm" placeholder="12.345,67" /></td>
                    <td className="px-3 py-2"><input value={v.n1} onChange={e => setDegerler(prev => ({ ...prev, [s.butce_kodu_id]: { ...v, n1: e.target.value } }))} className="w-full px-2 py-1 border border-slate-300 rounded text-right text-sm" placeholder="12.345,67" /></td>
                    <td className="px-3 py-2"><input value={v.n2} onChange={e => setDegerler(prev => ({ ...prev, [s.butce_kodu_id]: { ...v, n2: e.target.value } }))} className="w-full px-2 py-1 border border-slate-300 rounded text-right text-sm" placeholder="12.345,67" /></td>
                    <td className="px-3 py-2"><input value={v.n3} onChange={e => setDegerler(prev => ({ ...prev, [s.butce_kodu_id]: { ...v, n3: e.target.value } }))} className="w-full px-2 py-1 border border-slate-300 rounded text-right text-sm" placeholder="12.345,67" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={kaydetVeKapat}
          disabled={isPending}
          className="inline-flex items-center intrada-btn intrada-btn-kaydet disabled:opacity-60"
        >
          Kaydet ve Kapat
        </button>
      </div>
    </div>
  )
}
