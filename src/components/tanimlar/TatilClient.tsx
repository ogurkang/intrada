'use client'

import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import { useTanimlarSaltOkunur } from '@/components/tanimlar/TanimlarSaltOkunurContext'
import type { Tables } from '@/types/database'

type Tatil = Tables<'tanim_izin_tatil'>

const TATIL_TURLERI = ['Ulusal Bayram', 'Resmi Tatil', 'Dini Bayram', 'Hafta Sonu', 'İdari Tatil', 'Diğer']

function gunHesapla(bas: string, bit: string) {
  if (!bas || !bit) return '—'
  const fark = Math.round((new Date(bit).getTime() - new Date(bas).getTime()) / 86400000) + 1
  return fark > 0 ? `${fark} gün` : '—'
}

function tarihFormatla(t: string) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

interface Props {
  data: Tatil[]
  onAdd:    (fd: FormData) => Promise<{ hata?: string }>
  onUpdate: (id: number, fd: FormData) => Promise<{ hata?: string }>
  onToggle: (id: number, durum: boolean) => Promise<{ hata?: string }>
}

export default function TatilClient({ data, onAdd, onUpdate, onToggle }: Props) {
  const saltOkunur = useTanimlarSaltOkunur()
  const [modalAcik, setModalAcik]    = useState(false)
  const [secili, setSecili]          = useState<Tatil | null>(null)
  const [sunuciHata, setSunuciHata]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function yeniEkle()       { setSecili(null); setSunuciHata(null); setModalAcik(true) }
  function duzenle(t: Tatil){ setSecili(t);    setSunuciHata(null); setModalAcik(true) }
  function kapat()           { setModalAcik(false); setSecili(null); setSunuciHata(null) }

  function handleToggle(t: Tatil) {
    startTransition(async () => {
      const res = await onToggle(t.id, t.durum)
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
        <h1 className="text-2xl font-bold text-slate-800">Tatil Tanımları</h1>
        {!saltOkunur && (
        <button onClick={yeniEkle}
          className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Ekle
        </button>
        )}
      </div>

      {sunuciHata && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{sunuciHata}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-12">#</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Tatil Adı</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-32">Tür</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Başlangıç</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Bitiş</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-20">Süre</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Durum</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600 w-28">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">Henüz tatil kaydı yok.</td></tr>
            )}
            {data.map((t, i) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-400 tabular-nums">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{t.tatil_adi}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{t.tatil_turu ?? '—'}</td>
                <td className="px-4 py-3 text-center text-slate-600 text-xs tabular-nums">{tarihFormatla(t.tatil_baslangici)}</td>
                <td className="px-4 py-3 text-center text-slate-600 text-xs tabular-nums">{tarihFormatla(t.tatil_bitisi)}</td>
                <td className="px-4 py-3 text-center text-slate-500 text-xs font-medium">{gunHesapla(t.tatil_baslangici, t.tatil_bitisi)}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => handleToggle(t)} disabled={isPending || saltOkunur}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                      t.durum ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${t.durum ? 'bg-green-500' : 'bg-slate-400'}`} />
                    {t.durum ? 'Aktif' : 'Pasif'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  {!saltOkunur ? (
                  <button onClick={() => duzenle(t)}
                    className="text-sm text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    Düzenle
                  </button>
                  ) : <span className="text-xs text-slate-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 0 && <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">Toplam {data.length} kayıt</div>}
      </div>

      <Modal open={modalAcik} onClose={kapat} title={secili ? 'Tatil Düzenle' : 'Yeni Tatil Ekle'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tatil Adı <span className="text-red-500">*</span></label>
            <input name="tatil_adi" type="text" required defaultValue={secili?.tatil_adi ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="Cumhuriyet Bayramı" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tatil Türü</label>
            <select name="tatil_turu" defaultValue={secili?.tatil_turu ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
              <option value="">— Seçin —</option>
              {TATIL_TURLERI.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Başlangıç <span className="text-red-500">*</span></label>
              <input name="tatil_baslangici" type="date" required defaultValue={secili?.tatil_baslangici ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bitiş <span className="text-red-500">*</span></label>
              <input name="tatil_bitisi" type="date" required defaultValue={secili?.tatil_bitisi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
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
