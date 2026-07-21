'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Tables } from '@/types/database'

type IzinHak = Tables<'izin_haklari'>

interface Props {
  yil: number
  sicil_no: string
  ad_soyad: string | null
  statu: string | null
  hak: IzinHak | null
  returnTo: string
  canEdit: boolean
  onKaydet: (fd: FormData) => Promise<{ hata?: string }>
}

function renkBg(kalan: number) {
  if (kalan > 10) return 'text-green-700 font-semibold'
  if (kalan > 0) return 'text-amber-700 font-semibold'
  if (kalan < 0) return 'text-red-600 font-semibold'
  return 'text-slate-400'
}

export default function IzinHakTekSatirDuzenleClient({
  yil,
  sicil_no,
  ad_soyad,
  statu,
  hak,
  returnTo,
  canEdit,
  onKaydet,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)

  const devreden = hak?.devreden_gun ?? 0
  const hakEdilen = hak?.hak_edilen_gun ?? 0
  const kullanilan = hak?.kullanilan_gun ?? 0
  const kalan =
    hak != null
      ? hak.kalan_gun ?? devreden + hakEdilen - kullanilan
      : null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await onKaydet(fd)
      if (res.hata) setHata(res.hata)
      else router.push(returnTo)
    })
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">İzin hakkı düzenle</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {yil} yılı · {ad_soyad ?? sicil_no}
        </p>
      </div>

      {!canEdit && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border bg-amber-50 border-amber-200 text-amber-700">
          Bu işlem için admin yetkisi gerekir.
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <input type="hidden" name="yil" value={yil} />
        <input type="hidden" name="sicil_no" value={sicil_no} />

        <div className="flex flex-col xl:flex-row xl:flex-wrap xl:items-end gap-4 xl:gap-x-6 xl:gap-y-3">
          <div className="min-w-[7rem]">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">Sicil</p>
            <p className="text-sm font-mono text-slate-800 tabular-nums">{sicil_no}</p>
          </div>
          <div className="min-w-[10rem] flex-1">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">Ad Soyad</p>
            <p className="text-sm font-medium text-slate-800">{ad_soyad ?? '—'}</p>
          </div>
          <div className="min-w-[6rem]">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">Statü</p>
            <p className="text-sm text-slate-600">{statu ?? '—'}</p>
          </div>
          <div className="w-full sm:w-28 xl:w-24">
            <label htmlFor="devreden_gun" className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 block">
              Devreden
            </label>
            <input
              id="devreden_gun"
              name="devreden_gun"
              type="number"
              min={0}
              defaultValue={devreden}
              disabled={!canEdit}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:bg-slate-100"
            />
          </div>
          <div className="w-full sm:w-28 xl:w-24">
            <label htmlFor="hak_edilen_gun" className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 block">
              Hak edilen
            </label>
            <input
              id="hak_edilen_gun"
              name="hak_edilen_gun"
              type="number"
              min={0}
              defaultValue={hakEdilen}
              disabled={!canEdit}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:bg-slate-100"
            />
          </div>
          <div className="w-full sm:w-24 xl:w-20">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">Kullanılan</p>
            <p className="text-sm tabular-nums text-slate-600 pt-1.5">{hak ? `${kullanilan} gün` : '—'}</p>
          </div>
          <div className="w-full sm:w-24 xl:w-20">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">Kalan</p>
            <p className={`text-sm tabular-nums pt-1.5 ${kalan != null ? renkBg(kalan) : 'text-slate-400'}`}>
              {kalan != null ? `${kalan} gün` : '—'}
            </p>
          </div>
          <div className="flex items-center gap-2 xl:ml-auto pt-2 xl:pt-0">
            <Link
              href={returnTo}
              className="text-sm font-medium px-3 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
              İptal
            </Link>
            <button
              type="submit"
              disabled={isPending || !canEdit}
              className="text-sm font-medium px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : hak ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </div>

        {hata && <p className="text-sm text-red-600 mt-3">{hata}</p>}
      </form>
    </div>
  )
}
