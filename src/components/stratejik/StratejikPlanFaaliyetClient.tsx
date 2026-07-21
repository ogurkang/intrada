'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'

export interface SpFaaliyet {
  id: number
  alt_hedef_id: number
  sira_no: number | null
  faaliyet_adi: string
  aktif: boolean
  gosterge_sayisi: number
}

interface Props {
  donemId: number
  amacId: number
  hedefId: number
  performansHedefiId: number
  performansHedefiAdi: string
  faaliyetler: SpFaaliyet[]
  onEkle: (performansHedefiId: number, donemId: number, fd: FormData) => Promise<{ hata?: string }>
  onGuncelle: (id: number, donemId: number, fd: FormData) => Promise<{ hata?: string }>
}

export default function StratejikPlanFaaliyetClient({
  donemId,
  amacId,
  hedefId,
  performansHedefiId,
  performansHedefiAdi,
  faaliyetler,
  onEkle,
  onGuncelle,
}: Props) {
  const router = useRouter()
  const [formAcik, setFormAcik] = useState(false)
  const [secili, setSecili] = useState<SpFaaliyet | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function yeniAc() {
    setSecili(null)
    setHata(null)
    setFormAcik(true)
  }

  function duzenleAc(f: SpFaaliyet) {
    setSecili(f)
    setHata(null)
    setFormAcik(true)
  }

  function kaydet(fd: FormData) {
    setHata(null)
    startTransition(async () => {
      const res = secili ? await onGuncelle(secili.id, donemId, fd) : await onEkle(performansHedefiId, donemId, fd)
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
          <h1 className="text-2xl font-bold text-slate-800">{performansHedefiAdi}</h1>
          <p className="text-sm text-slate-500 mt-1">Bu performans hedefine bağlı faaliyetleri yönetebilirsiniz.</p>
        </div>
        <button onClick={yeniAc} className="intrada-btn intrada-btn-ekle">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Faaliyet Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-center w-20">Sıra No</th>
                <th className="px-4 py-3 text-left">Faaliyet Adı</th>
                <th className="px-4 py-3 text-left w-72">Bilgi</th>
                <th className="px-4 py-3 text-center w-28">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {faaliyetler.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-500">Bu performans hedefine bağlı faaliyet bulunamadı.</td></tr>
              ) : faaliyetler.map((f, i) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-center text-slate-600">{f.sira_no ?? i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link href={`/stratejik-yonetim/stratejik-plan/islemler/${donemId}/${amacId}/${hedefId}/${performansHedefiId}/${f.id}`} className="hover:underline">
                      {f.faaliyet_adi}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">Bu faaliyete bağlı {f.gosterge_sayisi} gösterge bulunmaktadır.</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Link href={`/stratejik-yonetim/stratejik-plan/islemler/${donemId}/${amacId}/${hedefId}/${performansHedefiId}/${f.id}`} className="intrada-icon-btn intrada-icon-btn-detay" title="Göstergeler">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                      <button onClick={() => duzenleAc(f)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors" title="Düzenle">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={formAcik} onClose={() => setFormAcik(false)} title={secili ? 'Faaliyet Düzenle' : 'Faaliyet Ekle'} size="sm">
        <form onSubmit={async e => { e.preventDefault(); await kaydet(new FormData(e.currentTarget)) }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Sıra No</label>
            <input name="sira_no" type="number" min={1} defaultValue={secili?.sira_no ?? ''} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Faaliyet Adı *</label>
            <textarea name="faaliyet_adi" required defaultValue={secili?.faaliyet_adi ?? ''} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
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
