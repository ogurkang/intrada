'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SMS_SABLON_TURLERI, SMS_SABLON_DEGISKENLERI, sablonTurEtiket } from '@/lib/sms-sablon'

export interface SablonGorunum {
  id: number
  tur: string
  baslik: string
  metin: string
  aktif: boolean
}

interface Props {
  sablonlar: SablonGorunum[]
  onKaydet: (fd: FormData) => Promise<{ hata?: string; ok?: boolean }>
  onSil: (id: number) => Promise<{ hata?: string; ok?: boolean }>
}

const BOS: SablonGorunum = { id: 0, tur: 'genel', baslik: '', metin: '', aktif: true }

export default function SmsSablonTanimClient({ sablonlar, onKaydet, onSil }: Props) {
  const router = useRouter()
  const [duzenle, setDuzenle] = useState<SablonGorunum | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function kaydet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await onKaydet(fd)
      if (res.hata) setHata(res.hata)
      else {
        setDuzenle(null)
        router.refresh()
      }
    })
  }

  function sil(id: number) {
    if (!confirm('Bu şablon silinsin mi?')) return
    startTransition(async () => {
      const res = await onSil(id)
      if (res.hata) setHata(res.hata)
      else router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Mesaj Şablonları</h2>
          <p className="text-xs text-slate-500 mt-1">
            Standart mesaj metinleri. Yer tutucu: {SMS_SABLON_DEGISKENLERI.join(', ')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setHata(null)
            setDuzenle({ ...BOS })
          }}
          className="px-3 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700"
        >
          Şablon Ekle
        </button>
      </div>

      {hata && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{hata}</p>}

      {duzenle && (
        <form onSubmit={kaydet} className="border border-slate-200 rounded-lg p-4 mb-4 bg-slate-50 space-y-3">
          <input type="hidden" name="id" value={duzenle.id || ''} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Şablon Türü</label>
              <select
                name="tur"
                defaultValue={duzenle.tur}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {SMS_SABLON_TURLERI.map(t => (
                  <option key={t.deger} value={t.deger}>
                    {t.etiket}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Başlık</label>
              <input
                name="baslik"
                defaultValue={duzenle.baslik}
                placeholder="Şablon adı"
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Mesaj Metni</label>
            <textarea
              name="metin"
              defaultValue={duzenle.metin}
              rows={4}
              maxLength={900}
              placeholder="Örn: Sayın {ad_soyad}, doğum gününüzü kutlarız."
              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm resize-none"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="aktif" defaultChecked={duzenle.aktif} />
            Aktif
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            <button
              type="button"
              onClick={() => setDuzenle(null)}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-white"
            >
              Vazgeç
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-slate-100">
        {sablonlar.map(s => (
          <div key={s.id} className="py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                  {sablonTurEtiket(s.tur)}
                </span>
                <span className="font-medium text-slate-800">{s.baslik}</span>
                {!s.aktif && <span className="text-xs text-amber-600">(pasif)</span>}
              </div>
              <p className="text-sm text-slate-500 mt-1 truncate">{s.metin}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setHata(null)
                  setDuzenle(s)
                }}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Düzenle
              </button>
              <button type="button" onClick={() => sil(s.id)} className="text-sm text-red-500 hover:text-red-700">
                Sil
              </button>
            </div>
          </div>
        ))}
        {!sablonlar.length && (
          <p className="py-6 text-center text-sm text-slate-400">Henüz şablon eklenmemiş.</p>
        )}
      </div>
    </div>
  )
}
