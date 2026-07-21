'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'

export interface PpProgram {
  id: number
  sira_no: number | null
  kodu: string
  program_adi: string
  aktif: boolean
}

interface Props {
  yil: number
  programlar: PpProgram[]
  onEkle: (yil: number, fd: FormData) => Promise<{ hata?: string }>
  onGuncelle: (id: number, yil: number, fd: FormData) => Promise<{ hata?: string }>
}

export default function PerformansProgramiProgramClient({
  yil,
  programlar,
  onEkle,
  onGuncelle,
}: Props) {
  const router = useRouter()
  const [formAcik, setFormAcik] = useState(false)
  const [secili, setSecili] = useState<PpProgram | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function yeniAc() {
    setSecili(null)
    setHata(null)
    setFormAcik(true)
  }
  function duzenleAc(a: PpProgram) {
    setSecili(a)
    setHata(null)
    setFormAcik(true)
  }
  function kaydet(fd: FormData) {
    setHata(null)
    startTransition(async () => {
      const res = secili ? await onGuncelle(secili.id, yil, fd) : await onEkle(yil, fd)
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
          <h1 className="text-2xl font-bold text-slate-800">{yil} Yılı Performans Programı</h1>
          <p className="text-sm text-slate-500 mt-1">Programları ekleyip düzenleyebilirsiniz.</p>
        </div>
        <button
          onClick={yeniAc}
          className="inline-flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Program Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[920px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-center w-20">Sıra No</th>
                <th className="px-4 py-3 text-left w-32">Kodu</th>
                <th className="px-4 py-3 text-left">Program Adı</th>
                <th className="px-4 py-3 text-center w-28">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {programlar.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    Bu yıl için program kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                programlar.map((p, i) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-center text-slate-600">{p.sira_no ?? i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{p.kodu}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <Link
                        href={`/stratejik-yonetim/performans-programi/islemler/${yil}/${p.id}`}
                        className="hover:underline"
                      >
                        {p.program_adi}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/stratejik-yonetim/performans-programi/islemler/${yil}/${p.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Detay"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => duzenleAc(p)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                          title="Düzenle"
                        >
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

      <Modal open={formAcik} onClose={() => setFormAcik(false)} title={secili ? 'Program Düzenle' : 'Program Ekle'} size="sm">
        <form
          onSubmit={async e => {
            e.preventDefault()
            await kaydet(new FormData(e.currentTarget))
          }}
          className="space-y-4"
        >
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Program Adı *</label>
            <input name="program_adi" required defaultValue={secili?.program_adi ?? ''} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
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
