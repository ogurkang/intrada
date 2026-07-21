'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'

export interface PpButceKoduRow {
  id: number
  adim_1: string
  adim_2: string
  adim_3: string
  adim_4: string
  ekonomik_kod: string
  hesap_adi: string
}

interface Props {
  rows: PpButceKoduRow[]
  onEkle: (fd: FormData) => Promise<{ hata?: string }>
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
}

function computeKod(a1: string, a2: string, a3: string, a4: string) {
  const fix = (s: string) => s.replace(/[^\d]/g, '').padStart(2, '0').slice(0, 2)
  return `${fix(a1)}.${fix(a2)}.${fix(a3)}.${fix(a4)}`
}

export default function PerformansProgramiButceKoduYonetimClient({ rows, onEkle, onGuncelle }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [formAcik, setFormAcik] = useState(false)
  const [secili, setSecili] = useState<PpButceKoduRow | null>(null)

  const [adim1, setAdim1] = useState('')
  const [adim2, setAdim2] = useState('')
  const [adim3, setAdim3] = useState('')
  const [adim4, setAdim4] = useState('')
  const [hesapAdi, setHesapAdi] = useState('')

  const ekonomikKodOnizleme = useMemo(() => computeKod(adim1, adim2, adim3, adim4), [adim1, adim2, adim3, adim4])

  function modalAc(row?: PpButceKoduRow) {
    const r = row ?? null
    setSecili(r)
    setAdim1(r?.adim_1 ?? '')
    setAdim2(r?.adim_2 ?? '')
    setAdim3(r?.adim_3 ?? '')
    setAdim4(r?.adim_4 ?? '')
    setHesapAdi(r?.hesap_adi ?? '')
    setFormAcik(true)
  }

  function excelIceriAktar() {
    if (!file) {
      setHata('Önce bir Excel dosyası seçiniz.')
      setMesaj(null)
      return
    }
    setHata(null)
    setMesaj(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/performans-programi/butce-kodu/import', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setHata(String(data?.error ?? 'İçe aktarma başarısız.'))
        return
      }
      setMesaj(`${Number(data?.kaydedilen ?? 0).toLocaleString('tr-TR')} satır içe aktarıldı.`)
      setFile(null)
      router.refresh()
    })
  }

  function kaydet() {
    const fd = new FormData()
    fd.set('adim_1', adim1)
    fd.set('adim_2', adim2)
    fd.set('adim_3', adim3)
    fd.set('adim_4', adim4)
    fd.set('hesap_adi', hesapAdi)
    setHata(null)
    setMesaj(null)
    startTransition(async () => {
      const res = secili ? await onGuncelle(secili.id, fd) : await onEkle(fd)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      setFormAcik(false)
      setMesaj(secili ? 'Kayıt güncellendi.' : 'Yeni kayıt eklendi.')
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bütçe Kodu Tanımı</h1>
          <p className="text-sm text-slate-500 mt-1">Excel ile toplu yükleyebilir veya tek tek bütçe kodu ekleyebilirsiniz.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Dosya Seç
          </button>
          <button
            type="button"
            onClick={excelIceriAktar}
            disabled={isPending}
            className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-3 py-2 text-sm font-medium hover:bg-emerald-600 disabled:opacity-60"
          >
            Excel İçe Aktar
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={() => modalAc()}
            className="intrada-btn intrada-btn-ekle px-3 py-2"
          >
            Bütçe Kodu Ekle
          </button>
        </div>
      </div>

      {hata && <div className="px-3 py-2 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700">{hata}</div>}
      {mesaj && <div className="px-3 py-2 text-sm rounded-lg bg-green-50 border border-green-200 text-green-700">{mesaj}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-700">
          Toplam kayıt: <span className="font-semibold">{rows.length.toLocaleString('tr-TR')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1040px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-center w-20">Sıra</th>
                <th className="px-3 py-2 text-center w-20">Adım 1</th>
                <th className="px-3 py-2 text-center w-20">Adım 2</th>
                <th className="px-3 py-2 text-center w-20">Adım 3</th>
                <th className="px-3 py-2 text-center w-20">Adım 4</th>
                <th className="px-3 py-2 text-left w-40">Ekonomik Kod</th>
                <th className="px-3 py-2 text-left">Hesap Adı</th>
                <th className="px-3 py-2 text-center w-28">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-slate-500">Henüz bütçe kodu kaydı bulunamadı.</td>
                </tr>
              ) : (
                rows.map((k, i) => (
                  <tr key={k.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-center text-slate-600">{i + 1}</td>
                    <td className="px-3 py-2 text-center font-mono text-xs">{k.adim_1}</td>
                    <td className="px-3 py-2 text-center font-mono text-xs">{k.adim_2}</td>
                    <td className="px-3 py-2 text-center font-mono text-xs">{k.adim_3}</td>
                    <td className="px-3 py-2 text-center font-mono text-xs">{k.adim_4}</td>
                    <td className="px-3 py-2 font-mono text-xs">{k.ekonomik_kod}</td>
                    <td className="px-3 py-2 text-slate-800">{k.hesap_adi}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => modalAc(k)}
                        className="inline-flex items-center rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Düzenle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={formAcik} onClose={() => setFormAcik(false)} title={secili ? 'Bütçe Kodu Düzenle' : 'Bütçe Kodu Ekle'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Adım 1</label>
              <input value={adim1} onChange={e => setAdim1(e.target.value)} className="w-full px-2 py-2 border border-slate-300 rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Adım 2</label>
              <input value={adim2} onChange={e => setAdim2(e.target.value)} className="w-full px-2 py-2 border border-slate-300 rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Adım 3</label>
              <input value={adim3} onChange={e => setAdim3(e.target.value)} className="w-full px-2 py-2 border border-slate-300 rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Adım 4</label>
              <input value={adim4} onChange={e => setAdim4(e.target.value)} className="w-full px-2 py-2 border border-slate-300 rounded text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Ekonomik Kod</label>
            <input value={ekonomikKodOnizleme} readOnly className="w-full px-2 py-2 border border-slate-200 rounded text-sm bg-slate-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Hesap Adı</label>
            <input value={hesapAdi} onChange={e => setHesapAdi(e.target.value)} className="w-full px-2 py-2 border border-slate-300 rounded text-sm" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setFormAcik(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">İptal</button>
            <button type="button" onClick={kaydet} disabled={isPending} className="px-4 py-2 text-sm text-white bg-slate-800 rounded-lg disabled:opacity-60">
              {isPending ? 'Kaydediliyor…' : secili ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
