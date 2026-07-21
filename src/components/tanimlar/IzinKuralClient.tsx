'use client'

import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import { useTanimlarSaltOkunur } from '@/components/tanimlar/TanimlarSaltOkunurContext'
import type { Tables } from '@/types/database'

type IzinKural = Tables<'tanim_izin_kural'>

interface Props {
  data: IzinKural[]
  statuler: string[]
  onAdd:    (fd: FormData) => Promise<{ hata?: string }>
  onUpdate: (id: number, fd: FormData) => Promise<{ hata?: string }>
  onToggle: (id: number, durum: boolean) => Promise<{ hata?: string }>
}

function EvetHayir({ deger }: { deger: boolean | null }) {
  if (deger === null || deger === undefined) return <span className="text-slate-300">—</span>
  return deger
    ? <span className="text-green-600 font-medium text-xs">✓ Sayılır</span>
    : <span className="text-slate-400 text-xs">Sayılmaz</span>
}

function CheckRow({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
      <input type="checkbox" name={name} defaultChecked={defaultChecked}
        className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500" />
      <div>
        <span className="block text-sm font-medium text-slate-700">{label}</span>
      </div>
    </label>
  )
}

export default function IzinKuralClient({ data, statuler, onAdd, onUpdate, onToggle }: Props) {
  const saltOkunur = useTanimlarSaltOkunur()
  const [modalAcik, setModalAcik]    = useState(false)
  const [secili, setSecili]          = useState<IzinKural | null>(null)
  const [sunuciHata, setSunuciHata]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function yeniEkle()          { setSecili(null); setSunuciHata(null); setModalAcik(true) }
  function duzenle(k: IzinKural){ setSecili(k);   setSunuciHata(null); setModalAcik(true) }
  function kapat()              { setModalAcik(false); setSecili(null); setSunuciHata(null) }

  function handleToggle(k: IzinKural) {
    startTransition(async () => {
      const res = await onToggle(k.id, k.durum)
      if (res?.hata) setSunuciHata(res.hata)
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSunuciHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = secili ? await onUpdate(secili.id, fd) : await onAdd(fd)
      if (res?.hata) setSunuciHata(res.hata)
      else kapat()
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Yıllık İzin Kuralları</h1>
          <p className="text-sm text-slate-500 mt-1">Bu kurallar yıllık izin türüne ait kurallardır. Hangi günlerin izin süresinden sayılacağını belirler.</p>
        </div>
        {!saltOkunur && (
        <button onClick={yeniEkle}
          className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Tanım Ekle
        </button>
        )}
      </div>

      {sunuciHata && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{sunuciHata}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Statü</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">Cumartesi</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">Pazar</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">Hft.içi Tatil</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">Tatil/Hft.sonu</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Durum</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600 w-28">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">Henüz kural tanımlanmamış.</td></tr>
            )}
            {data.map((k) => (
              <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 font-medium text-slate-800">{k.statu}</td>
                <td className="px-4 py-3 text-center"><EvetHayir deger={k.cumartesi} /></td>
                <td className="px-4 py-3 text-center"><EvetHayir deger={k.pazar} /></td>
                <td className="px-4 py-3 text-center"><EvetHayir deger={k.haftaici_tatil} /></td>
                <td className="px-4 py-3 text-center"><EvetHayir deger={k.tatil_haftasonu} /></td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => handleToggle(k)} disabled={isPending || saltOkunur}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                      k.durum ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${k.durum ? 'bg-green-500' : 'bg-slate-400'}`} />
                    {k.durum ? 'Aktif' : 'Pasif'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  {!saltOkunur ? (
                  <button onClick={() => duzenle(k)}
                    className="text-sm text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    Düzenle
                  </button>
                  ) : <span className="text-xs text-slate-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 0 && <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">Toplam {data.length} kural</div>}
      </div>

      <Modal open={modalAcik} onClose={kapat} title={secili ? 'İzin Kuralı Düzenle' : 'Yeni İzin Kuralı Ekle'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Statü <span className="text-red-500">*</span></label>
            <select name="statu" required defaultValue={secili?.statu ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
              <option value="">— Seçin —</option>
              {statuler.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">İzin süresinden sayılacak günler</p>
            <CheckRow name="cumartesi"       label="Cumartesi günleri"          defaultChecked={secili?.cumartesi ?? false} />
            <CheckRow name="pazar"           label="Pazar günleri"              defaultChecked={secili?.pazar ?? false} />
            <CheckRow name="haftaici_tatil"  label="Hafta içi resmi tatil günleri" defaultChecked={secili?.haftaici_tatil ?? false} />
            <CheckRow name="tatil_haftasonu" label="Tatile denk gelen hafta sonu" defaultChecked={secili?.tatil_haftasonu ?? false} />
          </div>

          {sunuciHata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{sunuciHata}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={kapat}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : secili ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
