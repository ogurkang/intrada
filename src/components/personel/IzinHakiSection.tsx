'use client'

import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import type { Tables } from '@/types/database'

type IzinHak = Tables<'izin_haklari'>

interface Props {
  sicil_no: string
  haklar: IzinHak[]
  onKaydet: (sicil_no: string, fd: FormData) => Promise<{ hata?: string }>
}

export default function IzinHakiSection({ sicil_no, haklar, onKaydet }: Props) {
  const [modalAcik, setModalAcik]   = useState(false)
  const [secili, setSecili]         = useState<IzinHak | null>(null)
  const [sunuciHata, setSunuciHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function yeniEkleAc()        { setSecili(null); setSunuciHata(null); setModalAcik(true) }
  function duzenleAc(h: IzinHak){ setSecili(h);   setSunuciHata(null); setModalAcik(true) }
  function kapat()              { setModalAcik(false); setSecili(null); setSunuciHata(null) }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSunuciHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await onKaydet(sicil_no, fd)
      if (res.hata) setSunuciHata(res.hata)
      else kapat()
    })
  }

  const buYil = new Date().getFullYear()
  const sortedHaklar = [...haklar].sort((a, b) => b.yil - a.yil)

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Başlık */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">İzin Hakları (Yıllık)</h2>
        <button onClick={yeniEkleAc}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-300
                     px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yıl Ekle / Düzenle
        </button>
      </div>

      {sortedHaklar.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Henüz izin hakkı tanımlanmamış.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 w-20">Yıl</th>
                <th className="text-right px-4 py-2.5 font-semibold text-slate-500">Devreden</th>
                <th className="text-right px-4 py-2.5 font-semibold text-slate-500">Hak Edilen</th>
                <th className="text-right px-4 py-2.5 font-semibold text-slate-500">Kullanılan</th>
                <th className="text-right px-4 py-2.5 font-semibold text-slate-500 pr-6">Kalan</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedHaklar.map(h => {
                const kalan = (h.devreden_gun ?? 0) + (h.hak_edilen_gun ?? 0) - (h.kullanilan_gun ?? 0)
                const buYilmi = h.yil === buYil
                return (
                  <tr key={h.id} className={`hover:bg-slate-50 transition-colors ${buYilmi ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-2.5">
                      <span className={`font-semibold ${buYilmi ? 'text-blue-700' : 'text-slate-700'}`}>
                        {h.yil}
                      </span>
                      {buYilmi && (
                        <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Bu yıl</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{h.devreden_gun ?? 0}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{h.hak_edilen_gun ?? 0}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{h.kullanilan_gun ?? 0}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums pr-6">
                      <span className={`font-semibold ${kalan > 0 ? 'text-green-700' : kalan < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {kalan}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => duzenleAc(h)}
                        className="text-slate-400 hover:text-slate-700 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal open={modalAcik} onClose={kapat} title={secili ? `${secili.yil} Yılı Hakkını Düzenle` : 'Yıl İzin Hakkı Tanımla'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Yıl *</label>
            <input
              name="yil" type="number" required
              defaultValue={secili?.yil ?? buYil}
              readOnly={!!secili}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 read-only:bg-slate-50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Devreden Gün</label>
              <input
                name="devreden_gun" type="number" min="0"
                defaultValue={secili?.devreden_gun ?? 0}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 tabular-nums" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Hak Edilen Gün</label>
              <input
                name="hak_edilen_gun" type="number" min="0"
                defaultValue={secili?.hak_edilen_gun ?? 0}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 tabular-nums" />
            </div>
          </div>

          {sunuciHata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{sunuciHata}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={kapat}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            <button type="submit" disabled={isPending}
              className="intrada-btn intrada-btn-kaydet">
              {isPending ? 'Kaydediliyor…' : secili ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
