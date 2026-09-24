'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { IsgYonlendiriciDugme, ISG_YONLENDIRICI_BTN } from '@/components/isg/IsgYonlendiriciDugme'
import {
  ISG_DURUM_TANIMLARI,
  type MudurlukSecenek,
  type TespitOneriDurum,
} from '@/lib/isg-tespit-oneri'

export type TespitOneriFormKayit = {
  id: number
  sira_no: number
  isyeri_mudurluk_id: number
  tespit_oneri: string
  sorumlu_mudurluk_id: number
  isbirligi_mudurluk_id: number | null
  durum: TespitOneriDurum
  son_tarih: string
}

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500'
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700'

function MudurlukSec({
  name,
  label,
  zorunlu,
  secenekler,
  varsayilan,
}: {
  name: string
  label: string
  zorunlu?: boolean
  secenekler: MudurlukSecenek[]
  varsayilan?: number | null
}) {
  return (
    <label className={labelCls}>
      {label}
      {zorunlu ? <span className="text-red-500"> *</span> : null}
      <select name={name} defaultValue={varsayilan ?? ''} required={zorunlu} className={`mt-1.5 ${inputCls}`}>
        <option value="">Seçiniz</option>
        {secenekler.map(m => (
          <option key={m.id} value={m.id}>{m.mudurluk_adi}</option>
        ))}
      </select>
    </label>
  )
}

export default function TespitOneriFormClient({
  mudurlukler,
  kayit,
  baslik,
  onKaydet,
}: {
  mudurlukler: MudurlukSecenek[]
  kayit?: TespitOneriFormKayit | null
  baslik: string
  onKaydet: (fd: FormData) => Promise<{ hata?: string }>
}) {
  const router = useRouter()
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setHata(null)
    startTransition(async () => {
      const sonuc = await onKaydet(fd)
      if (sonuc.hata) {
        setHata(sonuc.hata)
        return
      }
      router.push('/isg/islemler/tespit-oneri')
      router.refresh()
    })
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
          {kayit ? <p className="mt-1 text-sm text-slate-500">Sıra No: {kayit.sira_no}</p> : null}
        </div>
        <IsgYonlendiriciDugme href="/isg/islemler/tespit-oneri">← Tespit ve Öneri</IsgYonlendiriciDugme>
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <MudurlukSec
          name="isyeri_mudurluk_id"
          label="İşyeri Unvanı"
          zorunlu
          secenekler={mudurlukler}
          varsayilan={kayit?.isyeri_mudurluk_id}
        />
        <label className={labelCls}>
          Tespit Öneri <span className="text-red-500">*</span>
          <textarea
            name="tespit_oneri"
            required
            rows={6}
            defaultValue={kayit?.tespit_oneri ?? ''}
            className={`mt-1.5 ${inputCls}`}
          />
        </label>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <MudurlukSec
            name="sorumlu_mudurluk_id"
            label="Sorumlu Müdürlük"
            zorunlu
            secenekler={mudurlukler}
            varsayilan={kayit?.sorumlu_mudurluk_id}
          />
          <MudurlukSec
            name="isbirligi_mudurluk_id"
            label="İş Birliği Yapılacak Müdürlük"
            secenekler={mudurlukler}
            varsayilan={kayit?.isbirligi_mudurluk_id}
          />
          <label className={labelCls}>
            Durum <span className="text-red-500">*</span>
            <select name="durum" required defaultValue={kayit?.durum ?? ''} className={`mt-1.5 ${inputCls}`}>
              <option value="">Seçiniz</option>
              {ISG_DURUM_TANIMLARI.map(durum => (
                <option key={durum.kod} value={durum.kod}>
                  {durum.kod} (%{durum.oran})
                </option>
              ))}
            </select>
          </label>
          <label className={labelCls} htmlFor="tespit-oneri-son-tarih">
            Son Tarih <span className="text-red-500">*</span>
            <input
              id="tespit-oneri-son-tarih"
              name="son_tarih"
              type="date"
              required
              defaultValue={(kayit?.son_tarih ?? '').toString().slice(0, 10)}
              className={`mt-1.5 ${inputCls}`}
            />
          </label>
        </div>

        {hata ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{hata}</p> : null}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <IsgYonlendiriciDugme href="/isg/islemler/tespit-oneri">İptal</IsgYonlendiriciDugme>
          <button type="submit" disabled={isPending} className={ISG_YONLENDIRICI_BTN}>
            {isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}
