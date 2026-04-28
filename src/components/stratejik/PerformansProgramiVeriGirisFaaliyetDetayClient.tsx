'use client'

import { useRouter } from 'next/navigation'
import { Fragment, useMemo, useState, useTransition } from 'react'

export interface PpVeriGirisSatir {
  gosterge_id: number
  sira_no: number | null
  gosterge_adi: string
  birim: string
  onceki_yil_gerceklesme: number | null
  cari_yil_planlanan: number | null
  cari_yil_gerceklesme_tahmini: number | null
  sonraki_yil_tahmin_1: number | null
  sonraki_yil_tahmin_2: number | null
  sonraki_yil_tahmin_3: number | null
  gosterge_aciklama: string
  hesaplama_yontemi: string
}

interface Props {
  yil: number
  faaliyetId: number
  satirlar: PpVeriGirisSatir[]
  onKaydet: (
    faaliyetId: number,
    yil: number,
    satirlar: {
      gosterge_id: number
      birim: string
      onceki_yil_gerceklesme: number | null
      cari_yil_planlanan: number | null
      cari_yil_gerceklesme_tahmini: number | null
      sonraki_yil_tahmin_1: number | null
      sonraki_yil_tahmin_2: number | null
      sonraki_yil_tahmin_3: number | null
      gosterge_aciklama: string
      hesaplama_yontemi: string
    }[],
  ) => Promise<{ hata?: string; kaydedilen?: number }>
}

function toNum(v: string): number | null {
  const s = String(v ?? '').trim().replace(/[.]/g, '').replace(',', '.')
  if (!s) return null
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : null
}

function fmt(v: number | null): string {
  if (v == null || Number.isNaN(v)) return ''
  return Number(v).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PerformansProgramiVeriGirisFaaliyetDetayClient({
  yil,
  faaliyetId,
  satirlar,
  onKaydet,
}: Props) {
  const router = useRouter()
  const [hata, setHata] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [degerler, setDegerler] = useState<Record<number, {
    birim: string
    onceki: string
    planlanan: string
    tahmin: string
    t1: string
    t2: string
    t3: string
    aciklama: string
    hesaplama: string
  }>>(() => {
    const map: Record<number, {
      birim: string
      onceki: string
      planlanan: string
      tahmin: string
      t1: string
      t2: string
      t3: string
      aciklama: string
      hesaplama: string
    }> = {}
    for (const s of satirlar) {
      map[s.gosterge_id] = {
        birim: s.birim ?? '',
        onceki: s.onceki_yil_gerceklesme == null ? '' : fmt(s.onceki_yil_gerceklesme),
        planlanan: s.cari_yil_planlanan == null ? '' : String(s.cari_yil_planlanan),
        tahmin: s.cari_yil_gerceklesme_tahmini == null ? '' : String(s.cari_yil_gerceklesme_tahmini),
        t1: s.sonraki_yil_tahmin_1 == null ? '' : String(s.sonraki_yil_tahmin_1),
        t2: s.sonraki_yil_tahmin_2 == null ? '' : String(s.sonraki_yil_tahmin_2),
        t3: s.sonraki_yil_tahmin_3 == null ? '' : String(s.sonraki_yil_tahmin_3),
        aciklama: s.gosterge_aciklama ?? '',
        hesaplama: s.hesaplama_yontemi ?? '',
      }
    }
    return map
  })

  const payload = useMemo(
    () =>
      satirlar.map(s => {
        const v = degerler[s.gosterge_id] ?? { planlanan: '', tahmin: '', aciklama: '', hesaplama: '' }
        return {
          gosterge_id: s.gosterge_id,
          birim: v.birim.trim(),
          onceki_yil_gerceklesme: toNum(v.onceki),
          cari_yil_planlanan: toNum(v.planlanan),
          cari_yil_gerceklesme_tahmini: toNum(v.tahmin),
          sonraki_yil_tahmin_1: toNum(v.t1),
          sonraki_yil_tahmin_2: toNum(v.t2),
          sonraki_yil_tahmin_3: toNum(v.t3),
          gosterge_aciklama: v.aciklama.trim(),
          hesaplama_yontemi: v.hesaplama.trim(),
        }
      }),
    [satirlar, degerler],
  )

  function kaydetVeKapat() {
    setHata(null)
    setMesaj(null)
    startTransition(async () => {
      const res = await onKaydet(faaliyetId, yil, payload)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      router.push(`/stratejik-yonetim/performans-programi/islemler/${yil}/veri-giris`)
    })
  }

  function kaydetVeButce() {
    setHata(null)
    setMesaj(null)
    startTransition(async () => {
      const res = await onKaydet(faaliyetId, yil, payload)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      router.push(`/stratejik-yonetim/performans-programi/islemler/${yil}/veri-giris/${faaliyetId}/butce`)
    })
  }

  return (
    <div className="space-y-4">
      {hata && <div className="px-3 py-2 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700">{hata}</div>}
      {mesaj && <div className="px-3 py-2 text-sm rounded-lg bg-green-50 border border-green-200 text-green-700">{mesaj}</div>}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1320px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-300">
                <th className="px-4 py-3 text-center w-20 border-r border-slate-300">Sıra No</th>
                <th className="px-4 py-3 text-left border-r border-slate-300">Gösterge</th>
                <th className="px-4 py-3 text-left w-32 border-r border-slate-300">Birim</th>
                <th className="px-4 py-3 text-right w-36 border-r border-slate-300">{yil - 2} Gerçekleşme</th>
                <th className="px-4 py-3 text-right w-36 border-r border-slate-300">{yil - 1} Planlanan</th>
                <th className="px-4 py-3 text-right w-40 border-r border-slate-300">{yil - 1} Gerçekleşme Tahmini</th>
                <th className="px-4 py-3 text-right w-32 border-r border-slate-300">{yil} Tahmin</th>
                <th className="px-4 py-3 text-right w-32 border-r border-slate-300">{yil + 1} Tahmin</th>
                <th className="px-4 py-3 text-right w-32">{yil + 2} Tahmin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {satirlar.map((s, i) => {
                const v = degerler[s.gosterge_id] ?? {
                  birim: '',
                  onceki: '',
                  planlanan: '',
                  tahmin: '',
                  t1: '',
                  t2: '',
                  t3: '',
                  aciklama: '',
                  hesaplama: '',
                }
                return (
                  <Fragment key={s.gosterge_id}>
                    <tr key={`${s.gosterge_id}-main`} className="hover:bg-slate-50">
                      <td rowSpan={3} className="px-4 py-3 align-top text-center text-slate-600 font-medium border-r border-slate-300">
                        {s.sira_no ?? i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 border-r border-slate-300">{s.gosterge_adi}</td>
                      <td className="px-4 py-3 border-r border-slate-300">
                        <input
                          value={v.birim}
                          onChange={e => setDegerler(prev => ({ ...prev, [s.gosterge_id]: { ...v, birim: e.target.value } }))}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 border-r border-slate-300">
                        <input
                          value={v.onceki}
                          onChange={e => setDegerler(prev => ({ ...prev, [s.gosterge_id]: { ...v, onceki: e.target.value } }))}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 border-r border-slate-300">
                        <input
                          value={v.planlanan}
                          onChange={e => setDegerler(prev => ({ ...prev, [s.gosterge_id]: { ...v, planlanan: e.target.value } }))}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 border-r border-slate-300">
                        <input
                          value={v.tahmin}
                          onChange={e => setDegerler(prev => ({ ...prev, [s.gosterge_id]: { ...v, tahmin: e.target.value } }))}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 border-r border-slate-300">
                        <input
                          value={v.t1}
                          onChange={e => setDegerler(prev => ({ ...prev, [s.gosterge_id]: { ...v, t1: e.target.value } }))}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 border-r border-slate-300">
                        <input
                          value={v.t2}
                          onChange={e => setDegerler(prev => ({ ...prev, [s.gosterge_id]: { ...v, t2: e.target.value } }))}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={v.t3}
                          onChange={e => setDegerler(prev => ({ ...prev, [s.gosterge_id]: { ...v, t3: e.target.value } }))}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-right text-sm"
                        />
                      </td>
                    </tr>
                    <tr key={`${s.gosterge_id}-aciklama`} className="bg-slate-50/30">
                      <td className="px-4 py-2 text-xs font-medium text-slate-700">Göstergeye İlişkin Açıklama</td>
                      <td colSpan={7} className="px-4 py-3">
                        <input
                          value={v.aciklama}
                          onChange={e => setDegerler(prev => ({ ...prev, [s.gosterge_id]: { ...v, aciklama: e.target.value } }))}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                        />
                      </td>
                    </tr>
                    <tr key={`${s.gosterge_id}-hesaplama`} className="bg-slate-50/20 border-b border-slate-200">
                      <td className="px-4 py-2 text-xs font-medium text-slate-700">Hesaplama Yöntemi</td>
                      <td colSpan={7} className="px-4 py-3">
                        <input
                          value={v.hesaplama}
                          onChange={e => setDegerler(prev => ({ ...prev, [s.gosterge_id]: { ...v, hesaplama: e.target.value } }))}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                        />
                      </td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={kaydetVeKapat}
          disabled={isPending}
          className="inline-flex items-center rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-60"
        >
          Kaydet ve Kapat
        </button>
        <button
          type="button"
          onClick={kaydetVeButce}
          disabled={isPending}
          className="inline-flex items-center rounded-lg bg-slate-700 text-white px-4 py-2 text-sm font-medium hover:bg-slate-600 disabled:opacity-60"
        >
          Kaydet ve Bütçe
        </button>
      </div>
    </div>
  )
}
