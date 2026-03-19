'use client'

import { useState, useTransition, useRef } from 'react'
import Modal from '@/components/ui/Modal'

export interface BasitTanimItem {
  id: number
  aktif: boolean
  [key: string]: unknown
}

interface Props<T extends BasitTanimItem> {
  baslik: string
  data: T[]
  nameField: string        // 'isim' | 'mudurluk_adi' | ...
  nameLabel: string        // 'İsim' | 'Müdürlük Adı' | ...
  /** Yeni kayıt ekle (Server Action) */
  onAdd: (formData: FormData) => Promise<{ hata?: string }>
  /** Kayıt güncelle (Server Action) */
  onUpdate: (id: number, formData: FormData) => Promise<{ hata?: string }>
  /** Aktif/Pasif değiştir (Server Action) */
  onToggle: (id: number, aktif: boolean) => Promise<{ hata?: string }>
}

export default function BasitTanimClient<T extends BasitTanimItem>({
  baslik,
  data,
  nameField,
  nameLabel,
  onAdd,
  onUpdate,
  onToggle,
}: Props<T>) {
  const [modalAcik, setModalAcik]   = useState(false)
  const [secili, setSecili]         = useState<T | null>(null)
  const [sunuciHata, setSunuciHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function yeniEkle() {
    setSecili(null)
    setSunuciHata(null)
    setModalAcik(true)
  }

  function duzenle(item: T) {
    setSecili(item)
    setSunuciHata(null)
    setModalAcik(true)
  }

  function kapat() {
    setModalAcik(false)
    setSecili(null)
    setSunuciHata(null)
  }

  function handleToggle(item: T) {
    startTransition(async () => {
      const res = await onToggle(item.id, item.aktif)
      if (res?.hata) setSunuciHata(res.hata)
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSunuciHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = secili
        ? await onUpdate(secili.id, fd)
        : await onAdd(fd)
      if (res?.hata) {
        setSunuciHata(res.hata)
      } else {
        kapat()
      }
    })
  }

  return (
    <div>
      {/* Sayfa başlığı */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
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
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 font-semibold text-slate-600 w-16">#</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">{nameLabel}</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600 w-28">Durum</th>
              <th className="text-right px-5 py-3 font-semibold text-slate-600 w-36">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-400">
                  Henüz kayıt yok. &ldquo;Yeni Ekle&rdquo; butonu ile başlayın.
                </td>
              </tr>
            )}
            {data.map((item, i) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 text-slate-400 tabular-nums">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-slate-800">
                  {String(item[nameField] ?? '')}
                </td>
                <td className="px-5 py-3 text-center">
                  <button
                    onClick={() => handleToggle(item)}
                    disabled={isPending}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                                transition-colors disabled:opacity-50 ${
                      item.aktif
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${item.aktif ? 'bg-green-500' : 'bg-slate-400'}`} />
                    {item.aktif ? 'Aktif' : 'Pasif'}
                  </button>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => duzenle(item)}
                    className="text-sm text-slate-600 hover:text-slate-900 font-medium
                               px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Düzenle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
            Toplam {data.length} kayıt
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalAcik}
        onClose={kapat}
        title={secili ? `${baslik} Düzenle` : `Yeni ${baslik} Ekle`}
        size="sm"
      >
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {nameLabel}
            </label>
            <input
              name={nameField}
              type="text"
              required
              defaultValue={secili ? String(secili[nameField] ?? '') : ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              placeholder={`${nameLabel} girin`}
            />
          </div>

          {sunuciHata && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {sunuciHata}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={kapat}
              className="px-4 py-2 text-sm font-medium text-slate-600
                         border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isPending}
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
