'use client'

import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import type { Tables } from '@/types/database'

type IzinHak = Tables<'tanim_izin_hak'>

interface Props {
  data: IzinHak[]
  statuler: string[]
  onAdd:    (fd: FormData) => Promise<{ hata?: string }>
  onUpdate: (id: number, fd: FormData) => Promise<{ hata?: string }>
  onToggle: (id: number, durum: boolean) => Promise<{ hata?: string }>
}

export default function IzinHakClient({ data, statuler, onAdd, onUpdate, onToggle }: Props) {
  const [modalAcik, setModalAcik]    = useState(false)
  const [secili, setSecili]          = useState<IzinHak | null>(null)
  const [sunuciHata, setSunuciHata]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function yeniEkle()       { setSecili(null); setSunuciHata(null); setModalAcik(true) }
  function duzenle(h: IzinHak){ setSecili(h);  setSunuciHata(null); setModalAcik(true) }
  function kapat()           { setModalAcik(false); setSecili(null); setSunuciHata(null) }

  function handleToggle(h: IzinHak) {
    startTransition(async () => {
      const res = await onToggle(h.id, h.durum)
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
          <h1 className="text-2xl font-bold text-slate-800">İzin Hakları</h1>
          <p className="text-sm text-slate-500 mt-1">Statüye göre yıllık izin gün hakları</p>
        </div>
        <button onClick={yeniEkle}
          className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Ekle
        </button>
      </div>

      {sunuciHata && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{sunuciHata}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 font-semibold text-slate-600 w-12">#</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Statü</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600 w-24">En Az (yıl)</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600 w-24">En Çok (yıl)</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600 w-28">Hak (gün)</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600 w-28">Geçerlilik (yıl)</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600 w-24">Durum</th>
              <th className="text-right px-5 py-3 font-semibold text-slate-600 w-28">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">Henüz kayıt yok.</td></tr>
            )}
            {data.map((h, i) => (
              <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 text-slate-400 tabular-nums">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-slate-800">{h.statu}</td>
                <td className="px-5 py-3 text-center text-slate-600">{h.en_az ?? '—'}</td>
                <td className="px-5 py-3 text-center text-slate-600">{h.en_cok ?? '—'}</td>
                <td className="px-5 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 font-bold text-slate-800 text-sm">
                    {h.hak_edilen_gun}
                  </span>
                </td>
                <td className="px-5 py-3 text-center text-slate-600">{h.gecerlilik_suresi_yil ?? '—'}</td>
                <td className="px-5 py-3 text-center">
                  <button onClick={() => handleToggle(h)} disabled={isPending}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                      h.durum ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${h.durum ? 'bg-green-500' : 'bg-slate-400'}`} />
                    {h.durum ? 'Aktif' : 'Pasif'}
                  </button>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => duzenle(h)}
                    className="text-sm text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    Düzenle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 0 && <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">Toplam {data.length} kural</div>}
      </div>

      <Modal open={modalAcik} onClose={kapat} title={secili ? 'İzin Hakkı Düzenle' : 'Yeni İzin Hakkı Ekle'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Statü <span className="text-red-500">*</span></label>
            <select name="statu" required defaultValue={secili?.statu ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
              <option value="">— Seçin —</option>
              {statuler.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">En Az (yıl)</label>
              <input name="en_az" type="number" min={0} defaultValue={secili?.en_az ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">En Çok (yıl)</label>
              <input name="en_cok" type="number" min={0} defaultValue={secili?.en_cok ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Hak (gün) <span className="text-red-500">*</span></label>
              <input name="hak_edilen_gun" type="number" min={1} required defaultValue={secili?.hak_edilen_gun ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="20" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Geçerlilik Süresi (yıl)</label>
            <input name="gecerlilik_suresi_yil" type="number" min={0} defaultValue={secili?.gecerlilik_suresi_yil ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="1" />
            <p className="text-xs text-slate-400 mt-1">Hak edilen iznin ne kadar süre geçerli olduğu</p>
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
