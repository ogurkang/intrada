'use client'

import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import { useTanimlarSaltOkunur } from '@/components/tanimlar/TanimlarSaltOkunurContext'
import type { Tables } from '@/types/database'

type Unvan = Tables<'tanim_unvan'>

interface Props {
  data: Unvan[]
  onAdd:    (fd: FormData) => Promise<{ hata?: string }>
  onUpdate: (id: number, fd: FormData) => Promise<{ hata?: string }>
  onToggle: (id: number, aktif: boolean) => Promise<{ hata?: string }>
}

export default function UnvanClient({ data, onAdd, onUpdate, onToggle }: Props) {
  const saltOkunur = useTanimlarSaltOkunur()
  const [modalAcik, setModalAcik]    = useState(false)
  const [secili, setSecili]          = useState<Unvan | null>(null)
  const [sunuciHata, setSunuciHata]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function yeniEkle()       { setSecili(null);  setSunuciHata(null); setModalAcik(true) }
  function duzenle(u: Unvan){ setSecili(u);     setSunuciHata(null); setModalAcik(true) }
  function kapat()           { setModalAcik(false); setSecili(null); setSunuciHata(null) }

  function handleToggle(u: Unvan) {
    startTransition(async () => {
      const res = await onToggle(u.id, u.aktif)
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

  const siniflar = ['GİH', 'TH', 'SHS', 'AH', 'EH', 'DH', 'YH', 'ZB']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Unvan Tanımları</h1>
        {!saltOkunur && (
        <button
          onClick={yeniEkle}
          className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2
                     rounded-lg hover:bg-slate-700 transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Ekle
        </button>
        )}
      </div>

      {sunuciHata && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {sunuciHata}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-12">#</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Kod</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Unvan Adı</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Sınıf</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-20">Arazi</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 w-24">Katsayı</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Durum</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 w-28">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Henüz unvan kaydı yok.
                  </td>
                </tr>
              )}
              {data.map((u, i) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-slate-500 text-xs">{u.unvan_kodu ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{u.unvan_adi}</td>
                  <td className="px-4 py-3 text-slate-600">{u.sinif_adi ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {u.arazi ? (
                      <span className="text-green-600 text-xs font-medium">✓ Var</span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600">
                    {u.kat_sayi != null ? Number(u.kat_sayi).toFixed(4) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(u)}
                      disabled={isPending || saltOkunur}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                                  transition-colors disabled:opacity-50 ${
                        u.aktif
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${u.aktif ? 'bg-green-500' : 'bg-slate-400'}`} />
                      {u.aktif ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!saltOkunur ? (
                    <button
                      onClick={() => duzenle(u)}
                      className="text-sm text-slate-600 hover:text-slate-900 font-medium
                                 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Düzenle
                    </button>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            Toplam {data.length} kayıt
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalAcik}
        onClose={kapat}
        title={secili ? 'Unvan Düzenle' : 'Yeni Unvan Ekle'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sıra No + Kod */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sıra No</label>
              <input
                name="sira_no" type="number" min={0}
                defaultValue={secili?.sira_no ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Unvan Kodu</label>
              <input
                name="unvan_kodu" type="text"
                defaultValue={secili?.unvan_kodu ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="MÜH"
              />
            </div>
          </div>

          {/* Unvan Adı */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Unvan Adı <span className="text-red-500">*</span>
            </label>
            <input
              name="unvan_adi" type="text" required
              defaultValue={secili?.unvan_adi ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="Mühendis"
            />
          </div>

          {/* Sınıf */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Sınıf</label>
            <select
              name="sinif_adi"
              defaultValue={secili?.sinif_adi ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
            >
              <option value="">— Seçin —</option>
              {siniflar.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Katsayı + Arazi */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Katsayı</label>
              <input
                name="kat_sayi" type="number" step="0.0001" min={0}
                defaultValue={secili?.kat_sayi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="1.0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Arazi Tazminatı</label>
              <select
                name="arazi"
                defaultValue={secili?.arazi ? 'true' : 'false'}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
              >
                <option value="false">Yok</option>
                <option value="true">Var</option>
              </select>
            </div>
          </div>

          {sunuciHata && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{sunuciHata}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button" onClick={kapat}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300
                         rounded-lg hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit" disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800
                         rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Kaydediliyor…' : secili ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
