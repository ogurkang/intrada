'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export interface PpBagliAmac {
  id: number
  amac_id: number
  amac_adi: string
  hedef_sayisi: number
  alt_hedef_sayisi: number
  faaliyet_sayisi: number
  gosterge_sayisi: number
}

interface Props {
  yil: number
  programId: number
  altProgramId: number
  faaliyetId: number
  faaliyetAdi: string
  amacSecenekleri: { id: number; amac_adi: string }[]
  bagliAmaclar: PpBagliAmac[]
  onEkle: (faaliyetId: number, yil: number, programId: number, altProgramId: number, fd: FormData) => Promise<{ hata?: string }>
}

export default function PerformansProgramiFaaliyetAmacClient({ yil, programId, altProgramId, faaliyetId, faaliyetAdi, amacSecenekleri, bagliAmaclar, onEkle }: Props) {
  const router = useRouter()
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{faaliyetAdi}</h1>
        <p className="text-sm text-slate-500 mt-1">Stratejik plandan amaç bağlayabilirsiniz.</p>
      </div>
      <form
        onSubmit={e => {
          e.preventDefault()
          const form = e.currentTarget
          setHata(null)
          startTransition(async () => {
            const res = await onEkle(faaliyetId, yil, programId, altProgramId, new FormData(form))
            if (res.hata) setHata(res.hata)
            else {
              form.reset()
              router.refresh()
            }
          })
        }}
        className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Amaç *</label>
          <select name="amac_id" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="">Seçiniz...</option>
            {amacSecenekleri.map(a => <option key={a.id} value={a.id}>{a.amac_adi}</option>)}
          </select>
        </div>
        <button type="submit" disabled={isPending} className="inline-flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50">
          Amaç Ekle
        </button>
      </form>
      {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[980px]">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left">Amaç</th>
              <th className="px-4 py-3 text-center w-24">Hedef</th>
              <th className="px-4 py-3 text-center w-28">Perf. Hedefi</th>
              <th className="px-4 py-3 text-center w-24">Faaliyet</th>
              <th className="px-4 py-3 text-center w-24">Gösterge</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {bagliAmaclar.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">Bağlı amaç yok.</td></tr> : bagliAmaclar.map(a => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{a.amac_adi}</td>
                  <td className="px-4 py-3 text-center">{a.hedef_sayisi}</td>
                  <td className="px-4 py-3 text-center">{a.alt_hedef_sayisi}</td>
                  <td className="px-4 py-3 text-center">{a.faaliyet_sayisi}</td>
                  <td className="px-4 py-3 text-center">{a.gosterge_sayisi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
