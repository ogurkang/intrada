'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import type { Tables } from '@/types/database'

type YD = Tables<'yevmiye_donem'> & { puantaj_sayisi: number }

interface Props {
  donemler:   YD[]
  onEkle:     (fd: FormData) => Promise<{ hata?: string }>
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
  onKapat:    (id: number) => Promise<{ hata?: string }>
  onAc:       (id: number) => Promise<{ hata?: string }>
}

function tarih(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

function DonemForm({ open, onClose, secili, onSubmit, isPending, hata }: {
  open: boolean; onClose: () => void; secili: YD | null
  onSubmit: (fd: FormData) => Promise<void>; isPending: boolean; hata: string | null
}) {
  const d = secili
  const buYil = new Date().getFullYear()
  return (
    <Modal open={open} onClose={onClose} title={d ? 'Dönem Düzenle' : 'Yeni Dönem Ekle'} size="sm">
      <form onSubmit={async e => { e.preventDefault(); await onSubmit(new FormData(e.currentTarget)) }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Yıl *</label>
            <input name="yil" type="number" required defaultValue={d?.yil ?? buYil} min={2000} max={2100}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Sıra No</label>
            <input name="sira_no" type="text" defaultValue={d?.sira_no ?? ''} placeholder="2024/1"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Dönem Adı</label>
          <input name="donem_adi" type="text" defaultValue={d?.donem_adi ?? ''} placeholder="Ocak 2024"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Başlangıç *</label>
            <input name="baslangic_tarihi" type="date" required defaultValue={d?.baslangic_tarihi ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bitiş *</label>
            <input name="bitis_tarihi" type="date" required defaultValue={d?.bitis_tarihi ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
        </div>
        {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
          <button type="submit" disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50">
            {isPending ? 'Kaydediliyor…' : d ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function YevmiyeDonemClient({ donemler, onEkle, onGuncelle, onKapat }: Props) {
  const [yilFiltre, setYilFiltre]     = useState(new Date().getFullYear())
  const [durumFiltre, setDurumFiltre] = useState<'Tümü' | 'Açık' | 'Kapalı'>('Tümü')
  const [formAcik, setFormAcik]       = useState(false)
  const [seciliDonem, setSeciliDonem] = useState<YD | null>(null)
  const [sunuciHata, setSunuciHata]   = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  const tumYillar = useMemo(() => {
    const s = new Set(donemler.map(d => d.yil)); s.add(new Date().getFullYear())
    return Array.from(s).sort((a, b) => b - a)
  }, [donemler])

  const filtreli = useMemo(() => {
    let list = donemler.filter(d => d.yil === yilFiltre)
    if (durumFiltre !== 'Tümü') list = list.filter(d => d.durum === durumFiltre)
    return list.sort((a, b) => b.id - a.id)
  }, [donemler, yilFiltre, durumFiltre])

  function yeniEkleAc()        { setSeciliDonem(null); setSunuciHata(null); setFormAcik(true) }
  function duzenleAc(d: YD)    { setSeciliDonem(d);    setSunuciHata(null); setFormAcik(true) }
  function kapat()              { setFormAcik(false); setSeciliDonem(null); setSunuciHata(null) }

  async function handleSubmit(fd: FormData) {
    setSunuciHata(null)
    startTransition(async () => {
      const res = seciliDonem ? await onGuncelle(seciliDonem.id, fd) : await onEkle(fd)
      if (res.hata) setSunuciHata(res.hata)
      else kapat()
    })
  }

  function handleKapat(id: number) {
    if (!confirm('Bu dönem kapatılacak. Onaylıyor musunuz?')) return
    startTransition(async () => { const res = await onKapat(id); if (res.hata) alert(res.hata) })
  }

  function handleAc(id: number) {
    if (!confirm('Bu dönem tekrar açılacak. Onaylıyor musunuz?')) return
    startTransition(async () => { const res = await onAc(id); if (res.hata) alert(res.hata) })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Yevmiye Puantajı</h1>
          <p className="text-sm text-slate-500 mt-0.5">Günlük saha çalışma puantajı dönemleri</p>
        </div>
        <button onClick={yeniEkleAc}
          className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Dönem
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select value={yilFiltre} onChange={e => setYilFiltre(Number(e.target.value))}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
          {tumYillar.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {(['Tümü', 'Açık', 'Kapalı'] as const).map(d => (
          <button key={d} onClick={() => setDurumFiltre(d)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              durumFiltre === d ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}>
            {d}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">Sıra No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Dönem Adı</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Başlangıç</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Bitiş</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Durum</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-40">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtreli.length === 0 && (
              <tr><td colSpan={6} className="text-center py-14 text-slate-400">{yilFiltre} yılında dönem kaydı yok.</td></tr>
            )}
            {filtreli.map(d => (
              <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.sira_no ?? '—'}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{d.donem_adi ?? `${d.yil} Dönemi`}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-500 tabular-nums">{tarih(d.baslangic_tarihi)}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-500 tabular-nums">{tarih(d.bitis_tarihi)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                    d.durum === 'Açık' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>{d.durum}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <Link href={`/kesintiler/yevmiye/${d.id}`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Detay">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                    <button onClick={() => duzenleAc(d)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Düzenle">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {d.durum === 'Açık' && (
                      <button onClick={() => handleKapat(d.id)} disabled={isPending}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Kapat">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </button>
                    )}
                    {d.durum === 'Kapalı' && (
                      <button onClick={() => handleAc(d.id)} disabled={isPending}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
                        title="Aç">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DonemForm open={formAcik} onClose={kapat} secili={seciliDonem}
        onSubmit={handleSubmit} isPending={isPending} hata={sunuciHata} />
    </div>
  )
}
