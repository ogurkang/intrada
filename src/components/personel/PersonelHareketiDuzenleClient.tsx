'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Tables } from '@/types/database'

type PH = Tables<'personel_hareketleri'>

const HAREKET_TURLERI = ['Atama', 'Görevlendirme', 'Nakil', 'Vekâlet', 'Görevden Alma', 'İstifa', 'Emeklilik', 'Diğer']
const SINIFLAR = ['GİH', 'TH', 'SHS', 'AH', 'EH', 'DH', 'YH', 'ZB']

interface Props {
  hareket: PH
  unvanlar: { id: number; unvan_adi: string }[]
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
}

export default function PersonelHareketiDuzenleClient({ hareket, unvanlar, onGuncelle }: Props) {
  const router = useRouter()
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const d = hareket

  function input(name: string, label: string, type = 'text', placeholder?: string) {
    const val = (d[name as keyof PH] as string | null) ?? ''
    return (
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
        <input name={name} type={type} defaultValue={val} placeholder={placeholder}
          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
      </div>
    )
  }

  function sel(name: string, label: string, options: string[]) {
    const val = (d[name as keyof PH] as string | null) ?? ''
    return (
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
        <select name={name} defaultValue={val}
          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
          <option value="">—</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }

  function selUnvan(name: string, label: string, unvanlar: { id: number; unvan_adi: string }[]) {
    const val = (d[name as keyof PH] as string | null) ?? ''
    return (
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
        <select name={name} defaultValue={val}
          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
          <option value="">—</option>
          {unvanlar.map(u => <option key={u.id} value={u.unvan_adi}>{u.unvan_adi}</option>)}
        </select>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await onGuncelle(hareket.id, fd)
      if (res.hata) setHata(res.hata)
      else router.push('/personel-hareketleri')
    })
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/personel-hareketleri"
          className="text-sm font-medium text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50">
          ← Listeye Dön
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Hareket Kaydı Düzenle</h1>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {sel('hareket_tipi', 'Hareket Tipi *', HAREKET_TURLERI)}
            {input('yururluk_tarihi', 'Yürürlük Tarihi *', 'date')}
            {input('kadro_sira_no', 'Kadro Sıra No')}
          </div>
          <hr className="border-slate-100" />
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Yeni Görev Bilgileri</p>
            <div className="grid grid-cols-2 gap-3">
              {input('yeni_gorev_yeri', 'Yeni Görev Yeri')}
              {selUnvan('yeni_unvan', 'Yeni Ünvan', unvanlar)}
              {sel('yeni_sinif', 'Sınıf', SINIFLAR)}
              {input('yeni_kadro_derecesi', 'Kadro Derecesi')}
              {input('yeni_kha_derece', 'KHA Derece')}
              {input('yeni_kha_kademe', 'KHA Kademe')}
              {input('yeni_ekea_derece', 'EKEA Derece')}
              {input('yeni_ekea_kademe', 'EKEA Kademe')}
            </div>
          </div>
          <hr className="border-slate-100" />
          <div className="grid grid-cols-3 gap-3">
            {input('ise_baslama_tarihi', 'İşe Başlama', 'date')}
            {input('ayrilis_tarihi', 'Ayrılış Tarihi', 'date')}
            {input('dayanak', 'Dayanak', 'text', 'Karar no veya belge')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {input('dagitim_mudurlukleri', 'Dağıtım Müdürlükleri')}
            {input('aciklama', 'Açıklama')}
          </div>
          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Link href="/personel-hareketleri"
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
              İptal
            </Link>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
