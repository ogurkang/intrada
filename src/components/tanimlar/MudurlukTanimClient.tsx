'use client'

import { useState, useTransition, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import { useTanimlarSaltOkunur } from '@/components/tanimlar/TanimlarSaltOkunurContext'
import type { Tables } from '@/types/database'

type MudurlukRow = Tables<'tanim_mudurluk'>

export type MudurlukKayit = MudurlukRow & {
  yerleske_adi_goster: string
  yerleske_adresi_ids: number[]
}

interface YerleskeSecenek {
  id: number
  label: string
}

interface Props {
  data: MudurlukKayit[]
  yerleskeSecenekleri: YerleskeSecenek[]
  onAdd: (formData: FormData) => Promise<{ hata?: string }>
  onUpdate: (id: number, formData: FormData) => Promise<{ hata?: string }>
  onToggle: (id: number, aktif: boolean) => Promise<{ hata?: string }>
}

const KONUM_SEC = [
  { value: 'İç', label: 'İç' },
  { value: 'Dış', label: 'Dış' },
]

const TEHLIKE_SEC = [
  { value: 'Az Tehlikeli', label: 'Az Tehlikeli' },
  { value: 'Tehlikeli', label: 'Tehlikeli' },
  { value: 'Çok Tehlikeli', label: 'Çok Tehlikeli' },
]

export default function MudurlukTanimClient({
  data,
  yerleskeSecenekleri,
  onAdd,
  onUpdate,
  onToggle,
}: Props) {
  const saltOkunur = useTanimlarSaltOkunur()
  const [modalAcik, setModalAcik] = useState(false)
  const [secili, setSecili] = useState<MudurlukKayit | null>(null)
  const [sunuciHata, setSunuciHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function yeniEkle() {
    setSecili(null)
    setSunuciHata(null)
    setModalAcik(true)
  }

  function duzenle(item: MudurlukKayit) {
    setSecili(item)
    setSunuciHata(null)
    setModalAcik(true)
  }

  function kapat() {
    setModalAcik(false)
    setSecili(null)
    setSunuciHata(null)
  }

  function handleToggle(item: MudurlukKayit) {
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
      const res = secili ? await onUpdate(secili.id, fd) : await onAdd(fd)
      if (res?.hata) setSunuciHata(res.hata)
      else kapat()
    })
  }

  const seciliYerleskeIds = new Set(secili?.yerleske_adresi_ids ?? [])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Müdürlükler</h1>
        {!saltOkunur && (
          <button
            type="button"
            onClick={yeniEkle}
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Ekle
          </button>
        )}
      </div>

      {sunuciHata && !modalAcik && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{sunuciHata}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 font-semibold text-slate-600 w-16">#</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Müdürlük Adı</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Yerleşke Adresi</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600 w-28">Konum</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600 w-36">Tehlike Sınıfı</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600 w-28">Durum</th>
              <th className="text-right px-5 py-3 font-semibold text-slate-600 w-36">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  Henüz kayıt yok. &ldquo;Yeni Ekle&rdquo; butonu ile başlayın.
                </td>
              </tr>
            )}
            {data.map((item, i) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 text-slate-400 tabular-nums">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-slate-800">{item.mudurluk_adi}</td>
                <td className="px-5 py-3 text-slate-600">{item.yerleske_adi_goster}</td>
                <td className="px-5 py-3 text-slate-600">{item.konum}</td>
                <td className="px-5 py-3 text-slate-600">{item.tehlike_sinifi}</td>
                <td className="px-5 py-3 text-center">
                  <button
                    onClick={() => handleToggle(item)}
                    disabled={isPending || saltOkunur}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
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
                  {!saltOkunur && (
                    <button
                      onClick={() => duzenle(item)}
                      className="text-sm text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Düzenle
                    </button>
                  )}
                  {saltOkunur && <span className="text-xs text-slate-400">—</span>}
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

      <Modal
        open={modalAcik}
        onClose={kapat}
        title={secili ? 'Müdürlük Düzenle' : 'Yeni Müdürlük Ekle'}
        size="md"
      >
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Müdürlük Adı</label>
            <input
              name="mudurluk_adi"
              type="text"
              required
              defaultValue={secili?.mudurluk_adi ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              placeholder="Müdürlük Adı girin"
            />
          </div>

          <div>
            <p className="block text-sm font-medium text-slate-700 mb-2">Yerleşke Adresi</p>
            {yerleskeSecenekleri.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                Aktif yerleşke adresi tanımı yok. Önce{' '}
                <a href="/tanimlar/yerleske-adresi" className="text-sky-600 hover:underline">
                  Yerleşke Adresleri
                </a>{' '}
                ekranından ekleyin.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {yerleskeSecenekleri.map(y => (
                  <label
                    key={y.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      name="yerleske_adresi_ids"
                      value={y.id}
                      defaultChecked={seciliYerleskeIds.has(y.id)}
                      className="rounded border-slate-300 text-slate-800 focus:ring-slate-500"
                    />
                    {y.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Konum</label>
            <select
              name="konum"
              required
              defaultValue={secili?.konum ?? 'İç'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              {KONUM_SEC.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tehlike Sınıfı</label>
            <select
              name="tehlike_sinifi"
              required
              defaultValue={secili?.tehlike_sinifi ?? 'Az Tehlikeli'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              {TEHLIKE_SEC.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {sunuciHata && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{sunuciHata}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={kapat}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isPending || saltOkunur}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Kaydediliyor…' : secili ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
