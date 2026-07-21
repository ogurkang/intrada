'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import Link from 'next/link'

export interface SpAltHedef {
  id: number
  hedef_id: number
  sira_no: number | null
  kodu: string
  alt_hedef_adi: string
  mudurluk: string
  aktif: boolean
}

interface Props {
  donemId: number
  amacId: number
  hedefId: number
  hedefAdi: string
  donemYillari: number[]
  altHedefler: SpAltHedef[]
  mudurlukler: string[]
  onEkle: (hedefId: number, donemId: number, fd: FormData) => Promise<{ hata?: string }>
  onGuncelle: (id: number, donemId: number, fd: FormData) => Promise<{ hata?: string }>
}

export default function StratejikPlanAltHedefClient({
  donemId,
  amacId,
  hedefId,
  hedefAdi,
  donemYillari,
  altHedefler,
  mudurlukler,
  onEkle,
  onGuncelle,
}: Props) {
  const router = useRouter()
  const [formAcik, setFormAcik] = useState(false)
  const [secili, setSecili] = useState<SpAltHedef | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function yeniAc() {
    setSecili(null)
    setHata(null)
    setFormAcik(true)
  }

  function duzenleAc(a: SpAltHedef) {
    setSecili(a)
    setHata(null)
    setFormAcik(true)
  }

  function kaydet(fd: FormData) {
    setHata(null)
    startTransition(async () => {
      const res = secili ? await onGuncelle(secili.id, donemId, fd) : await onEkle(hedefId, donemId, fd)
      if (res.hata) setHata(res.hata)
      else {
        setFormAcik(false)
        setSecili(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{hedefAdi}</h1>
          <p className="text-sm text-slate-500 mt-1">Bu hedefe bağlı performans hedeflerini yönetebilirsiniz.</p>
        </div>
        <button onClick={yeniAc} className="intrada-btn intrada-btn-ekle">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Performans Hedefi Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[980px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-center w-20">Sıra No</th>
                <th className="px-4 py-3 text-left w-32">Kodu</th>
                <th className="px-4 py-3 text-left">Performans Hedefi Adı</th>
                <th className="px-4 py-3 text-left w-72">Müdürlük</th>
                <th className="px-4 py-3 text-center w-28">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {altHedefler.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">Bu hedefe bağlı performans hedefi bulunamadı.</td></tr>
              ) : (
                altHedefler.map((a, i) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-center text-slate-600">{a.sira_no ?? i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{a.kodu}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{a.alt_hedef_adi}</td>
                    <td className="px-4 py-3 text-slate-700">{a.mudurluk}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/stratejik-yonetim/stratejik-plan/islemler/${donemId}/${amacId}/${hedefId}/${a.id}`}
                          className="intrada-icon-btn intrada-icon-btn-detay"
                          title="Göz"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <button onClick={() => duzenleAc(a)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors" title="Düzenle">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={formAcik} onClose={() => setFormAcik(false)} title={secili ? 'Performans Hedefi Düzenle' : 'Performans Hedefi Ekle'} size="sm">
        <form onSubmit={async e => { e.preventDefault(); await kaydet(new FormData(e.currentTarget)) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sıra No</label>
              <input name="sira_no" type="number" min={1} defaultValue={secili?.sira_no ?? ''} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kodu *</label>
              <input name="kodu" required defaultValue={secili?.kodu ?? ''} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Performans Hedefi Adı *</label>
            <input name="alt_hedef_adi" required defaultValue={secili?.alt_hedef_adi ?? ''} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {donemYillari.map((y, idx) => (
              <div key={y}>
                <label className="block text-xs font-medium text-slate-700 mb-1">{y}</label>
                <input name={`yil_${idx + 1}`} type="number" step="0.01" className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-slate-50" disabled />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Müdürlük *</label>
            <select name="mudurluk" required defaultValue={secili?.mudurluk ?? ''} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="">Seçiniz</option>
              {mudurlukler.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setFormAcik(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">İptal</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm text-white bg-slate-800 rounded-lg disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : secili ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

